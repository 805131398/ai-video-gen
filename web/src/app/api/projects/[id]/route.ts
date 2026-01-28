import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { StepType } from "@/generated/prisma/enums";
import type { ProjectPageResponse, TitleOption, CopyOption, ImageOption, VideoOption, CopywritingAttributes, VoiceConfigData } from "@/types/ai-video";

// 步骤类型到步骤数据键的映射
function getStepDataFromOptions(
  stepType: StepType,
  options: { id: string; content: string | null; assetUrl: string | null; metadata: unknown; isSelected: boolean }[],
  selectedOptionId: string | null,
  attributes: unknown
): Record<string, unknown> {
  switch (stepType) {
    case "TITLE_SELECT":
      return {
        titles: {
          options: options.map((o) => ({ id: o.id, content: o.content || "" })) as TitleOption[],
          selectedId: selectedOptionId,
        },
      };
    case "ATTRIBUTE_SET":
      return {
        attributes: attributes as CopywritingAttributes | null,
      };
    case "COPY_SELECT":
      return {
        copies: {
          options: options.map((o) => ({ id: o.id, content: o.content || "" })) as CopyOption[],
          selectedId: selectedOptionId,
        },
      };
    case "IMAGE_SELECT":
      return {
        images: {
          options: options.map((o) => ({ id: o.id, imageUrl: o.assetUrl || "" })) as ImageOption[],
          selectedIds: options.filter((o) => o.isSelected).map((o) => o.id),
        },
      };
    case "VIDEO_SELECT":
      return {
        videos: {
          options: options.map((o) => ({
            id: o.id,
            videoUrl: o.assetUrl || "",
            thumbnailUrl: (o.metadata as { thumbnailUrl?: string })?.thumbnailUrl || "",
            duration: (o.metadata as { duration?: number })?.duration || 0,
          })) as VideoOption[],
          selectedIds: options.filter((o) => o.isSelected).map((o) => o.id),
        },
      };
    case "VOICE_CONFIG":
      return {
        voice: attributes as VoiceConfigData | null,
      };
    case "COMPOSE":
      const selectedOption = options.find((o) => o.isSelected);
      return {
        compose: {
          videoUrl: selectedOption?.assetUrl || null,
          progress: selectedOption ? 100 : 0,
        },
      };
    default:
      return {};
  }
}

// GET /api/projects/[id] - 获取作品详情（返回 ProjectPageResponse 格式）
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

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        theme: true,
        characters: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        versions: {
          orderBy: { createdAt: "desc" },
          include: {
            steps: {
              orderBy: { createdAt: "asc" },
              include: {
                options: {
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    // 获取当前版本
    const currentVersion = project.versions.find((v) => v.id === project.currentVersionId) || project.versions[0];

    // 构建步骤数据
    const stepsData: ProjectPageResponse["steps"] = {
      topic: project.topic ? { value: project.topic } : null,
      titles: null,
      attributes: null,
      copies: null,
      images: null,
      videos: null,
      voice: null,
      compose: null,
    };

    // 从步骤中提取数据
    if (currentVersion?.steps) {
      for (const step of currentVersion.steps) {
        const stepData = getStepDataFromOptions(
          step.stepType,
          step.options,
          step.selectedOptionId,
          step.attributes
        );
        Object.assign(stepsData, stepData);
      }
    }

    const response: ProjectPageResponse = {
      id: project.id,
      topic: project.topic,
      title: project.title,
      status: project.status,
      currentStep: currentVersion?.currentStep || "TOPIC_INPUT",
      currentVersion: {
        id: currentVersion?.id || "",
        versionNo: currentVersion?.versionNo || 1,
      },
      theme: project.theme ? {
        id: project.theme.id,
        name: project.theme.name,
        description: project.theme.description,
      } : (project.themeName ? {
        id: null,
        name: project.themeName,
        description: project.themeDesc,
      } : null),
      characters: project.characters.map((char) => ({
        id: char.id,
        name: char.name,
        description: char.description,
        avatarUrl: char.avatarUrl,
        attributes: char.attributes,
      })),
      steps: stepsData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("获取作品详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/projects/[id] - 更新作品
export async function PUT(
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

    // 验证作品归属
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        title: body.title,
        status: body.status,
        coverUrl: body.coverUrl,
        finalVideoUrl: body.finalVideoUrl,
        isPublic: body.isPublic,
        currentVersionId: body.currentVersionId,
        themeId: body.themeId,
        themeName: body.themeName,
        themeDesc: body.themeDesc,
      },
    });

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("更新作品失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/projects/[id] - 删除作品
export async function DELETE(
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
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除作品失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
