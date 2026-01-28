import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/projects/[id]/scripts/[scriptId]/videos/status
 * 查询剧本所有场景的视频生成状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    // 1. 验证用户身份
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, scriptId } = await params;

    // 2. 验证项目和剧本是否存在
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId,
        project: {
          userId: user.id,
        },
      },
      include: {
        scenes: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            videos: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1, // 只取最新的一个视频记录
            },
          },
        },
      },
    });

    if (!script) {
      return NextResponse.json(
        { error: "剧本不存在或无权访问" },
        { status: 404 }
      );
    }

    // 3. 构建状态响应
    const scenes = script.scenes.map((scene) => {
      const latestVideo = scene.videos[0];

      return {
        sceneId: scene.id,
        sceneTitle: scene.title,
        status: latestVideo?.status || "no_video",
        progress: latestVideo?.progress ?? calculateProgress(latestVideo?.status), // 优先使用真实进度
        videoUrl: latestVideo?.videoUrl || null,
        thumbnailUrl: latestVideo?.thumbnailUrl || null,
        duration: latestVideo?.duration || null,
        errorMessage: latestVideo?.errorMessage || null,
        videoId: latestVideo?.id || null,
        createdAt: latestVideo?.createdAt || null,
      };
    });

    // 4. 计算整体状态
    const overallStatus = calculateOverallStatus(scenes);

    return NextResponse.json({
      success: true,
      scriptId,
      overallStatus,
      scenes,
      totalScenes: scenes.length,
      completedScenes: scenes.filter((s) => s.status === "completed").length,
      failedScenes: scenes.filter((s) => s.status === "failed").length,
      generatingScenes: scenes.filter((s) => s.status === "generating").length,
    });
  } catch (error) {
    console.error("Get video status error:", error);
    return NextResponse.json(
      { error: "查询视频状态失败" },
      { status: 500 }
    );
  }
}

/**
 * 计算进度百分比
 */
function calculateProgress(status?: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "generating":
      return 50;
    case "completed":
      return 100;
    case "failed":
      return 0;
    default:
      return 0;
  }
}

/**
 * 计算整体状态
 */
function calculateOverallStatus(
  scenes: Array<{ status: string }>
): "not_started" | "generating" | "completed" | "failed" | "partial" {
  if (scenes.length === 0) {
    return "not_started";
  }

  const statuses = scenes.map((s) => s.status);

  // 如果所有场景都完成
  if (statuses.every((s) => s === "completed")) {
    return "completed";
  }

  // 如果有场景正在生成
  if (statuses.some((s) => s === "generating")) {
    return "generating";
  }

  // 如果所有场景都失败
  if (statuses.every((s) => s === "failed")) {
    return "failed";
  }

  // 如果有部分完成
  if (statuses.some((s) => s === "completed")) {
    return "partial";
  }

  // 默认为未开始
  return "not_started";
}
