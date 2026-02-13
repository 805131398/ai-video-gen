import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { buildVideoPrompt } from "@/lib/services/video-prompt-builder";
import { buildStoryboardPrompt } from "@/lib/services/storyboard-prompt-builder";
import { createVideoClient } from "@/lib/ai/video-client";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";

interface GenerateVideosRequest {
  promptType?: "smart_combine" | "ai_optimized";
  sceneIds?: string[]; // 可选：指定要生成视频的场景 ID，不传则为所有场景生成
  aspectRatio?: string; // 宽高比，如 "16:9", "9:16", "1:1"
  mode?: "individual" | "storyboard"; // 生成模式：individual-单独生成，storyboard-故事板模式
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
    const aspectRatio = body.aspectRatio || "16:9"; // 默认 16:9
    const mode = body.mode || "individual"; // 默认单独生成模式

    // 2. 获取视频生成配置（bltcy）
    const videoConfig = await getEffectiveAIConfig("VIDEO", user.id, user.tenantId);
    if (!videoConfig) {
      return NextResponse.json(
        { error: "未配置视频生成服务" },
        { status: 500 }
      );
    }

    // 3. 验证项目和剧本是否存在
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

    // 5. 根据模式生成视频
    if (mode === "storyboard") {
      // 故事板模式：一次性生成所有场景
      return await generateStoryboardVideo(
        targetScenes,
        script.project.characters,
        videoConfig,
        aspectRatio,
        promptType,
        scriptId,
        user.id,
        user.tenantId
      );
    } else {
      // 单独生成模式：为每个场景单独生成视频
      const videoTasks = [];
      for (const scene of targetScenes) {
        // 构建 prompt
        const prompt = await buildVideoPrompt({
          type: promptType,
          scene,
          characters: script.project.characters,
          userId: user.id,
          tenantId: user.tenantId,
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
          duration: scene.duration || 10, // 场景时长或默认 10 秒
        });
      }

      // 6. 启动后台任务生成视频
      // 这里使用异步方式，不阻塞响应
      generateVideosInBackground(
        videoTasks,
        videoConfig,
        aspectRatio
      ).catch((error) => {
        console.error("Background video generation failed:", error);
      });

      // 7. 返回任务信息
      return NextResponse.json({
        success: true,
        message: `已提交 ${videoTasks.length} 个场景的视频生成任务`,
        mode: "individual",
        taskId: `${scriptId}-${Date.now()}`, // 生成一个任务 ID
        sceneCount: videoTasks.length,
        tasks: videoTasks.map((t) => ({
          sceneId: t.sceneId,
          sceneTitle: t.sceneTitle,
          videoId: t.videoId,
        })),
      });
    }
  } catch (error) {
    console.error("Generate videos error:", error);
    return NextResponse.json(
      { error: "生成视频失败" },
      { status: 500 }
    );
  }
}

/**
 * 故事板模式生成视频
 */
async function generateStoryboardVideo(
  scenes: any[],
  characters: any[],
  videoConfig: any,
  aspectRatio: string,
  promptType: "smart_combine" | "ai_optimized",
  scriptId: string,
  userId?: string,
  tenantId?: string
) {
  // 1. 为每个场景构建 prompt
  const scenePrompts = [];
  for (const scene of scenes) {
    const prompt = await buildVideoPrompt({
      type: promptType,
      scene,
      characters,
      userId,
      tenantId,
    });
    scenePrompts.push({
      title: scene.title,
      duration: scene.duration,
      prompt,
    });
  }

  // 2. 构建故事板格式的 prompt
  const storyboardPrompt = buildStoryboardPrompt(scenePrompts);

  // 3. 为第一个场景创建视频记录（故事板模式只创建一个视频记录）
  const firstScene = scenes[0];
  const sceneVideo = await prisma.sceneVideo.create({
    data: {
      sceneId: firstScene.id,
      videoUrl: "",
      prompt: storyboardPrompt,
      promptType: `${promptType}_storyboard`,
      status: "pending",
      metadata: {
        mode: "storyboard",
        sceneIds: scenes.map((s) => s.id),
        sceneCount: scenes.length,
      },
    },
  });

  // 4. 创建视频客户端
  const videoClient = createVideoClient({
    apiUrl: videoConfig.apiUrl,
    apiKey: videoConfig.apiKey,
    modelName: videoConfig.modelName,
    config: videoConfig.config as any,
  });

  // 5. 启动后台生成
  generateStoryboardInBackground(
    sceneVideo.id,
    storyboardPrompt,
    aspectRatio,
    videoClient,
    scenes
  ).catch((error) => {
    console.error("Background storyboard generation failed:", error);
  });

  // 6. 返回任务信息
  return NextResponse.json({
    success: true,
    message: `已提交故事板视频生成任务（包含 ${scenes.length} 个场景）`,
    mode: "storyboard",
    videoId: sceneVideo.id,
    sceneCount: scenes.length,
    scenes: scenes.map((s) => ({
      sceneId: s.id,
      sceneTitle: s.title,
    })),
  });
}

/**
 * 后台生成故事板视频
 */
async function generateStoryboardInBackground(
  videoId: string,
  storyboardPrompt: string,
  aspectRatio: string,
  videoClient: any,
  scenes: any[]
) {
  try {
    // 更新状态为 generating
    await prisma.sceneVideo.update({
      where: { id: videoId },
      data: { status: "generating" },
    });

    // 计算总时长
    const totalDuration = scenes.reduce(
      (sum, scene) => sum + (scene.duration || 10),
      0
    );

    // 提交视频生成任务
    const result = await videoClient.submit({
      prompt: storyboardPrompt,
      duration: Math.min(totalDuration, 25), // 最大 25 秒
      aspectRatio,
    });

    // 更新任务 ID
    await prisma.sceneVideo.update({
      where: { id: videoId },
      data: { taskId: result.taskId },
    });

    // 轮询查询状态
    const maxAttempts = 120;
    let attempts = 0;
    let completed = false;

    while (attempts < maxAttempts && !completed) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const status = await videoClient.getStatus(result.taskId);

      if (status.status === "completed") {
        // 生成成功
        await prisma.sceneVideo.update({
          where: { id: videoId },
          data: {
            status: "completed",
            videoUrl: status.videoUrl,
            thumbnailUrl: status.thumbnailUrl,
            duration: status.duration,
            metadata: {
              mode: "storyboard",
              sceneIds: scenes.map((s) => s.id),
              sceneCount: scenes.length,
            },
          },
        });

        console.log(`Storyboard video generated successfully: ${videoId}`);
        completed = true;
      } else if (status.status === "failed") {
        // 生成失败
        await prisma.sceneVideo.update({
          where: { id: videoId },
          data: {
            status: "failed",
            errorMessage: status.message || "故事板视频生成失败",
          },
        });

        console.error(`Storyboard video generation failed: ${videoId}`);
        completed = true;
      }
    }

    // 超时
    if (!completed) {
      await prisma.sceneVideo.update({
        where: { id: videoId },
        data: {
          status: "failed",
          errorMessage: "故事板视频生成超时（超过 10 分钟）",
        },
      });
    }
  } catch (error) {
    console.error(`Failed to generate storyboard video:`, error);

    // 更新状态为 failed
    await prisma.sceneVideo.update({
      where: { id: videoId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "未知错误",
      },
    });
  }
}

/**
 * 后台生成视频（使用 bltcy 视频适配器）
 * 这个函数会异步执行，不阻塞 API 响应
 */
async function generateVideosInBackground(
  videoTasks: Array<{
    sceneId: string;
    sceneTitle: string;
    videoId: string;
    prompt: string;
    duration: number;
  }>,
  videoConfig: any,
  aspectRatio: string
) {
  // 创建视频客户端
  const videoClient = createVideoClient({
    apiUrl: videoConfig.apiUrl,
    apiKey: videoConfig.apiKey,
    modelName: videoConfig.modelName,
    config: videoConfig.config as any,
  });

  for (const task of videoTasks) {
    try {
      // 更新状态为 generating
      await prisma.sceneVideo.update({
        where: { id: task.videoId },
        data: { status: "generating" },
      });

      // 提交视频生成任务
      const result = await videoClient.submit({
        prompt: task.prompt,
        duration: task.duration,
        aspectRatio,
      });

      // 更新任务 ID
      await prisma.sceneVideo.update({
        where: { id: task.videoId },
        data: { taskId: result.taskId },
      });

      // 轮询查询状态
      const maxAttempts = 120; // 最多轮询 120 次（10 分钟，每 5 秒一次）
      let attempts = 0;
      let completed = false;

      while (attempts < maxAttempts && !completed) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const status = await videoClient.getStatus(result.taskId);

        if (status.status === "completed") {
          // 生成成功
          await prisma.sceneVideo.update({
            where: { id: task.videoId },
            data: {
              status: "completed",
              videoUrl: status.videoUrl,
              thumbnailUrl: status.thumbnailUrl,
              duration: status.duration,
              metadata: status.metadata || {},
            },
          });

          console.log(`Video generated for scene ${task.sceneId}`);
          completed = true;
        } else if (status.status === "failed") {
          // 生成失败
          await prisma.sceneVideo.update({
            where: { id: task.videoId },
            data: {
              status: "failed",
              errorMessage: status.message || "视频生成失败",
            },
          });

          console.error(`Video generation failed for scene ${task.sceneId}`);
          completed = true;
        }
      }

      // 超时
      if (!completed) {
        await prisma.sceneVideo.update({
          where: { id: task.videoId },
          data: {
            status: "failed",
            errorMessage: "视频生成超时（超过 10 分钟）",
          },
        });
      }
    } catch (error) {
      console.error(
        `Failed to generate video for scene ${task.sceneId}:`,
        error
      );

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
