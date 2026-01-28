import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { buildVideoPrompt } from "@/lib/services/video-prompt-builder";
import { generateVideos } from "@/lib/ai/video-generator";

interface GenerateVideosRequest {
  promptType?: "smart_combine" | "ai_optimized";
  sceneIds?: string[]; // 可选：指定要生成视频的场景 ID，不传则为所有场景生成
}

/**
 * POST /api/projects/[id]/scripts/[scriptId]/generate-videos
 * 为剧本的场景生成视频
 * - 如果传入 sceneIds，只为指定场景生成视频
 * - 如果不传 sceneIds，为所有场景生成视频
 */
export async function POST(
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
    const body: GenerateVideosRequest = await request.json();
    const promptType = body.promptType || "smart_combine";
    const sceneIds = body.sceneIds; // 可选的场景 ID 列表

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
        },
        project: {
          include: {
            characters: true,
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

    // 3. 检查是否有场景
    if (!script.scenes || script.scenes.length === 0) {
      return NextResponse.json(
        { error: "剧本没有场景，无法生成视频" },
        { status: 400 }
      );
    }

    // 4. 过滤要生成视频的场景
    let targetScenes = script.scenes;
    if (sceneIds && sceneIds.length > 0) {
      targetScenes = script.scenes.filter((scene) =>
        sceneIds.includes(scene.id)
      );
      if (targetScenes.length === 0) {
        return NextResponse.json(
          { error: "指定的场景不存在" },
          { status: 400 }
        );
      }
    }

    // 5. 为每个场景创建视频生成任务
    const videoTasks = [];
    for (const scene of targetScenes) {
      // 构建 prompt
      const prompt = await buildVideoPrompt({
        type: promptType,
        scene,
        characters: script.project.characters,
      });

      // 创建视频记录（状态为 pending）
      const sceneVideo = await prisma.sceneVideo.create({
        data: {
          sceneId: scene.id,
          videoUrl: "", // 暂时为空，生成完成后更新
          prompt,
          promptType,
          status: "pending",
        },
      });

      videoTasks.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        videoId: sceneVideo.id,
        prompt,
      });
    }

    // 6. 启动后台任务生成视频
    // 这里使用异步方式，不阻塞响应
    generateVideosInBackground(videoTasks, projectId, scriptId).catch(
      (error) => {
        console.error("Background video generation failed:", error);
      }
    );

    // 7. 返回任务信息
    return NextResponse.json({
      success: true,
      message: `已提交 ${videoTasks.length} 个场景的视频生成任务`,
      taskId: `${scriptId}-${Date.now()}`, // 生成一个任务 ID
      sceneCount: videoTasks.length,
      tasks: videoTasks.map((t) => ({
        sceneId: t.sceneId,
        sceneTitle: t.sceneTitle,
        videoId: t.videoId,
      })),
    });
  } catch (error) {
    console.error("Generate videos error:", error);
    return NextResponse.json(
      { error: "生成视频失败" },
      { status: 500 }
    );
  }
}

/**
 * 后台生成视频
 * 这个函数会异步执行，不阻塞 API 响应
 */
async function generateVideosInBackground(
  videoTasks: Array<{
    sceneId: string;
    sceneTitle: string;
    videoId: string;
    prompt: string;
  }>,
  projectId: string,
  scriptId: string
) {
  for (const task of videoTasks) {
    try {
      // 更新状态为 generating
      await prisma.sceneVideo.update({
        where: { id: task.videoId },
        data: { status: "generating" },
      });

      // 调用视频生成 API
      const videoResult = await callVideoGenerationAPI(task.prompt);

      // 更新视频记录
      await prisma.sceneVideo.update({
        where: { id: task.videoId },
        data: {
          status: "completed",
          videoUrl: videoResult.videoUrl,
          thumbnailUrl: videoResult.thumbnailUrl,
          duration: videoResult.duration,
          taskId: videoResult.taskId,
          metadata: videoResult.metadata,
        },
      });

      console.log(`Video generated for scene ${task.sceneId}`);
    } catch (error) {
      console.error(`Failed to generate video for scene ${task.sceneId}:`, error);

      // 更新状态为 failed
      await prisma.sceneVideo.update({
        where: { id: task.videoId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "未知错误",
        },
      });
    }
  }
}

/**
 * 调用视频生成服务
 * 直接调用 generateVideos 函数，避免 HTTP 调用的认证问题
 */
async function callVideoGenerationAPI(prompt: string): Promise<{
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  taskId: string;
  metadata: any;
}> {
  try {
    // 直接调用视频生成函数
    const videos = await generateVideos(
      [
        {
          imageUrl: "", // 暂时为空，实际应该从场景中获取
          prompt,
          duration: 5,
        },
      ],
      1
    );

    const video = videos[0];

    return {
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      taskId: "", // generateVideos 不返回 taskId
      metadata: video.metadata,
    };
  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
}
