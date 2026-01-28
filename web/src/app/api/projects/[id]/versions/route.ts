import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/versions - 获取版本列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    // 验证作品归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    const versions = await prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      include: {
        steps: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ data: versions });
  } catch (error) {
    console.error("获取版本列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/projects/[id]/versions - 创建新版本（回溯分支）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { parentVersionId, branchName, branchFromStep } = body;

    // 验证作品归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    // 获取最大版本号
    const maxVersion = await prisma.projectVersion.findFirst({
      where: { projectId: id },
      orderBy: { versionNo: "desc" },
    });

    const newVersionNo = (maxVersion?.versionNo || 0) + 1;

    // 步骤顺序定义
    const stepOrder = [
      "TOPIC_INPUT",
      "TITLE_GENERATE",
      "TITLE_SELECT",
      "ATTRIBUTE_SET",
      "COPY_GENERATE",
      "COPY_SELECT",
      "IMAGE_GENERATE",
      "IMAGE_SELECT",
      "VIDEO_GENERATE",
      "VIDEO_SELECT",
      "VOICE_CONFIG",
      "VOICE_GENERATE",
      "COMPOSE",
    ];

    // 使用事务创建版本和复制数据
    const version = await prisma.$transaction(async (tx) => {
      // 创建新版本
      const newVersion = await tx.projectVersion.create({
        data: {
          projectId: id,
          parentVersionId,
          versionNo: newVersionNo,
          branchName: branchName || `分支 ${newVersionNo}`,
          currentStep: branchFromStep || "TOPIC_INPUT",
          isMain: false,
        },
      });

      // 如果有父版本和分支点，复制数据
      if (parentVersionId && branchFromStep) {
        const branchStepIndex = stepOrder.indexOf(branchFromStep);

        // 获取父版本的步骤数据（只到分支点）
        const parentSteps = await tx.projectStep.findMany({
          where: { versionId: parentVersionId },
          include: {
            options: true,
          },
          orderBy: { createdAt: "asc" },
        });

        // 复制步骤数据（只复制到分支点之前的步骤）
        for (const step of parentSteps) {
          const stepIndex = stepOrder.indexOf(step.stepType);
          if (stepIndex < branchStepIndex) {
            // 创建新步骤
            const newStep = await tx.projectStep.create({
              data: {
                versionId: newVersion.id,
                stepType: step.stepType,
                selectedOptionId: null, // 稍后更新
                attributes: step.attributes || undefined,
                status: step.status,
              },
            });

            // 复制选项
            let newSelectedOptionId: string | null = null;
            for (const option of step.options) {
              const newOption = await tx.stepOption.create({
                data: {
                  stepId: newStep.id,
                  content: option.content,
                  assetUrl: option.assetUrl,
                  metadata: option.metadata || undefined,
                  isSelected: option.isSelected,
                  sortOrder: option.sortOrder,
                },
              });

              if (option.id === step.selectedOptionId) {
                newSelectedOptionId = newOption.id;
              }
            }

            // 更新选中的选项ID
            if (newSelectedOptionId) {
              await tx.projectStep.update({
                where: { id: newStep.id },
                data: { selectedOptionId: newSelectedOptionId },
              });
            }
          }
        }
      }

      return newVersion;
    });

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (error) {
    console.error("创建版本失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
