import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StepStatus } from "@/generated/prisma/enums";
import { generateSingleImage, generateImagePromptFromCopy } from "@/lib/ai/image-generator";
import { randomUUID } from "crypto";

// 存储正在进行的任务（内存中，用于取消功能）
const runningTasks = new Map<string, { cancelled: boolean }>();

// POST /api/projects/[id]/steps/images/generate - 生成图片（异步）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { count = 4, customPrompt } = body;

    console.log("[images/generate] 开始生成图片", {
      projectId,
      count,
      hasCustomPrompt: !!customPrompt,
      userId: session.user.id
    });

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { versions: { where: { isMain: true }, take: 1 } },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const versionId = project.currentVersionId || project.versions[0]?.id;
    if (!versionId) {
      return NextResponse.json({ error: "版本不存在" }, { status: 404 });
    }

    // 获取选中的文案内容，用于生成图片提示词
    const copyStep = await prisma.projectStep.findFirst({
      where: { versionId, stepType: "COPY_SELECT" },
      include: { options: { where: { isSelected: true } } },
    });

    const copyContent = copyStep?.options[0]?.content || project.topic;
    console.log("[images/generate] 文案内容:", copyContent?.substring(0, 100));

    // 获取或创建图片步骤
    const imageStep = await prisma.projectStep.upsert({
      where: {
        versionId_stepType: { versionId, stepType: "IMAGE_SELECT" },
      },
      create: {
        versionId,
        stepType: "IMAGE_SELECT",
        status: StepStatus.GENERATING,
      },
      update: {
        status: StepStatus.GENERATING,
      },
    });

    // 更新版本当前步骤
    await prisma.projectVersion.update({
      where: { id: versionId },
      data: { currentStep: "IMAGE_SELECT" },
    });

    // 获取当前最大 sortOrder
    const maxSortOption = await prisma.stepOption.findFirst({
      where: { stepId: imageStep.id },
      orderBy: { sortOrder: "desc" },
    });
    const baseSortOrder = (maxSortOption?.sortOrder || 0) + 1;

    // 创建批次ID
    const batchId = randomUUID();
    const batchStartTime = new Date().toISOString();

    // 注册任务
    runningTasks.set(batchId, { cancelled: false });

    // 异步生成图片（不等待）
    generateImagesAsync(
      copyContent,
      count,
      session.user.id,
      imageStep.id,
      baseSortOrder,
      batchId,
      batchStartTime,
      customPrompt
    );

    // 立即返回，告诉前端正在生成中
    return NextResponse.json({
      success: true,
      status: "generating",
      batchId,
      message: "图片正在生成中，请稍后刷新查看",
    });
  } catch (error) {
    console.error("生成图片失败:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/steps/images/generate - 取消生成任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const url = new URL(request.url);
    const batchId = url.searchParams.get("batchId");

    if (batchId && runningTasks.has(batchId)) {
      // 标记任务为已取消
      runningTasks.get(batchId)!.cancelled = true;
      console.log("[images/generate] 任务已取消:", batchId);
    }

    // 获取项目和步骤
    const { id: projectId } = await params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { versions: { where: { isMain: true }, take: 1 } },
    });

    if (project) {
      const versionId = project.currentVersionId || project.versions[0]?.id;
      if (versionId) {
        // 更新步骤状态为完成（允许用户继续操作）
        await prisma.projectStep.updateMany({
          where: {
            versionId,
            stepType: "IMAGE_SELECT",
            status: StepStatus.GENERATING,
          },
          data: { status: StepStatus.COMPLETED },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("取消任务失败:", error);
    return NextResponse.json({ error: "取消失败" }, { status: 500 });
  }
}

/**
 * 异步生成图片并保存到数据库（并发生成，实时保存）
 */
async function generateImagesAsync(
  copyContent: string,
  count: number,
  userId: string,
  stepId: string,
  baseSortOrder: number,
  batchId: string,
  batchStartTime: string,
  customPrompt?: string
) {
  let generatedCount = 0;
  const overallStartTime = Date.now();

  try {
    // 检查任务是否已取消
    const task = runningTasks.get(batchId);
    if (task?.cancelled) {
      console.log("[images/generate] 任务已取消，跳过生成:", batchId);
      runningTasks.delete(batchId);
      return;
    }

    // 生成或使用自定义提示词
    let imagePrompt: string;
    if (customPrompt) {
      imagePrompt = customPrompt;
      console.log("[images/generate] 使用自定义提示词:", imagePrompt?.substring(0, 100));
    } else {
      console.log("[images/generate] 开始生成图片提示词...");
      const result = await generateImagePromptFromCopy(
        copyContent,
        undefined,
        userId,
        undefined
      );
      imagePrompt = result.prompt;  // 使用英文提示词
      console.log("[images/generate] 图片提示词:", imagePrompt?.substring(0, 100));
    }

    // 并发生成图片
    console.log(`[images/generate] 开始并发生成 ${count} 张图片...`);
    const generatePromises = Array.from({ length: count }, async (_, i) => {
      // 检查是否取消
      if (runningTasks.get(batchId)?.cancelled) {
        console.log(`[images/generate] 任务已取消，跳过第 ${i + 1} 张`);
        return null;
      }

      console.log(`[images/generate] 开始生成第 ${i + 1}/${count} 张图片...`);
      const imageStartTime = Date.now();

      try {
        const image = await generateSingleImage(
          { prompt: imagePrompt },
          userId,
          undefined
        );

        if (image) {
          // 立即保存到数据库
          await prisma.stepOption.create({
            data: {
              stepId,
              assetUrl: image.imageUrl,
              metadata: {
                source: "ai",
                prompt: imagePrompt,
                revisedPrompt: image.revisedPrompt,
                model: image.metadata?.model,
                size: image.metadata?.size,
                batchId,
                batchStartTime,
                generatedAt: new Date().toISOString(),
              },
              sortOrder: baseSortOrder + i,
            },
          });
          const imageElapsed = Date.now() - imageStartTime;
          console.log(`[images/generate] 第 ${i + 1}/${count} 张图片已保存，耗时: ${imageElapsed}ms`);
          return image;
        }
      } catch (error) {
        console.error(`[images/generate] 第 ${i + 1}/${count} 张生成失败:`, error);
        return null;
      }
      return null;
    });

    // 等待所有任务完成
    const results = await Promise.all(generatePromises);
    generatedCount = results.filter(r => r !== null).length;

    const overallElapsed = Date.now() - overallStartTime;
    console.log(`[images/generate] 批次完成，共生成 ${generatedCount}/${count} 张图片，总耗时: ${overallElapsed}ms`);

    // 更新步骤状态为完成
    await prisma.projectStep.update({
      where: { id: stepId },
      data: { status: StepStatus.COMPLETED },
    });
    console.log("[images/generate] 步骤状态已更新为完成");

    // 清理任务记录
    runningTasks.delete(batchId);
  } catch (error) {
    console.error("[images/generate] 异步生成图片失败:", error);
    // 如果已经生成了一些图片，状态设为完成；否则设为失败
    await prisma.projectStep.update({
      where: { id: stepId },
      data: { status: generatedCount > 0 ? StepStatus.COMPLETED : StepStatus.FAILED },
    });
    // 清理任务记录
    runningTasks.delete(batchId);
  }
}
