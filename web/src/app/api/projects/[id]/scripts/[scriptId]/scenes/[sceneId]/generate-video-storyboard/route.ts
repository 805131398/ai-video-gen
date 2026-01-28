import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { createVideoClient } from "@/lib/ai/video-client";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";

interface GenerateStoryboardVideoRequest {
  aspectRatio?: string; // 宽高比，如 "16:9", "9:16"
  useCharacterImage?: boolean; // 是否使用角色形象作为参考图
}

/**
 * POST /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/generate-video-storyboard
 * 为单个场景生成故事板格式的视频（支持角色数字人形象）
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; scriptId: string; sceneId: string }>;
  }
) {
  try {
    // 1. 验证用户身份
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, scriptId, sceneId } = await params;
    const body: GenerateStoryboardVideoRequest = await request.json();
    const aspectRatio = body.aspectRatio || "16:9";
    const useCharacterImage = body.useCharacterImage !== false; // 默认使用

    // 2. 验证场景是否存在，并获取角色信息
    const scene = await prisma.scriptScene.findFirst({
      where: {
        id: sceneId,
        scriptId,
        script: {
          projectId,
          project: {
            userId: user.id,
          },
        },
      },
      include: {
        script: {
          include: {
            project: {
              include: {
                characters: true,
              },
            },
          },
        },
      },
    });

    if (!scene) {
      return NextResponse.json(
        { error: "场景不存在或无权访问" },
        { status: 404 }
      );
    }

    // 3. 构建故事板格式的 prompt
    const storyboardPrompt = buildSceneStoryboardPrompt(scene);

    // 4. 获取角色的数字人形象（如果有）
    let referenceImage: string | undefined;
    if (useCharacterImage) {
      referenceImage = await getCharacterImage(
        scene,
        scene.script.project.characters
      );
    }

    // 5. 获取视频生成配置
    const videoConfig = await getEffectiveAIConfig("VIDEO", user.id, user.tenantId);
    if (!videoConfig) {
      return NextResponse.json(
        { error: "未配置视频生成服务" },
        { status: 500 }
      );
    }

    // 6. 创建视频记录
    const sceneVideo = await prisma.sceneVideo.create({
      data: {
        sceneId: scene.id,
        videoUrl: "",
        prompt: storyboardPrompt,
        promptType: "storyboard_auto",
        status: "pending",
        metadata: {
          mode: "storyboard",
          useCharacterImage,
          referenceImage,
        },
      },
    });

    // 7. 调用 bltcy 视频适配器
    try {
      const videoClient = createVideoClient({
        apiUrl: videoConfig.apiUrl,
        apiKey: videoConfig.apiKey,
        modelName: videoConfig.modelName,
        config: videoConfig.config as any,
      });

      // 更新状态为 generating
      await prisma.sceneVideo.update({
        where: { id: sceneVideo.id },
        data: { status: "generating" },
      });

      // 提交视频生成任务
      const result = await videoClient.submit({
        prompt: storyboardPrompt,
        imageUrl: referenceImage, // 角色数字人形象作为参考图
        duration: scene.duration || 10,
        aspectRatio,
      });

      // 更新任务 ID
      await prisma.sceneVideo.update({
        where: { id: sceneVideo.id },
        data: { taskId: result.taskId },
      });

      // 启动后台轮询
      pollVideoStatus(sceneVideo.id, result.taskId, videoClient).catch(
        (error) => {
          console.error("Background polling failed:", error);
        }
      );

      // 返回任务信息
      return NextResponse.json({
        success: true,
        message: "故事板视频生成任务已提交",
        videoId: sceneVideo.id,
        taskId: result.taskId,
        sceneId: scene.id,
        sceneTitle: scene.title,
        storyboardPrompt,
        referenceImage,
      });
    } catch (error) {
      // 生成失败
      await prisma.sceneVideo.update({
        where: { id: sceneVideo.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "未知错误",
        },
      });

      throw error;
    }
  } catch (error) {
    console.error("Generate storyboard video error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成视频失败",
      },
      { status: 500 }
    );
  }
}

/**
 * 构建场景的故事板格式 prompt
 */
function buildSceneStoryboardPrompt(scene: any): string {
  const content = scene.content as any;
  const duration = scene.duration || 10;

  // 提取场景的关键信息
  const description = content.description || "";
  const actions = content.actions || {};
  const camera = content.camera || {};
  const visual = content.visual || {};
  const dialogues = content.dialogues || [];

  // 构建场景描述
  let sceneDescription = description;

  // 添加动作描述
  if (actions.main) {
    sceneDescription += `. ${actions.main}`;
  }

  // 添加镜头描述
  if (camera.description) {
    sceneDescription += `. Camera: ${camera.description}`;
  }

  // 添加视觉效果
  if (visual.description) {
    sceneDescription += `. Visual: ${visual.description}`;
  }

  // 添加对话（如果有）
  if (dialogues.length > 0) {
    const dialogue = dialogues[0];
    sceneDescription += `. ${dialogue.speaker}: "${dialogue.text}"`;
  }

  // 构建故事板格式
  return `Shot 1:\nduration: ${duration}sec\nScene: ${sceneDescription}`;
}

/**
 * 获取场景主要角色的数字人形象
 */
async function getCharacterImage(
  scene: any,
  characters: any[]
): Promise<string | undefined> {
  const content = scene.content as any;
  const characterId = content.characterId;

  if (!characterId) {
    return undefined;
  }

  // 查找角色
  const character = characters.find((c) => c.id === characterId);
  if (!character) {
    return undefined;
  }

  // 获取角色的数字人形象
  const digitalHuman = await prisma.characterDigitalHuman.findFirst({
    where: {
      characterId: character.id,
      isSelected: true,
    },
  });

  return digitalHuman?.imageUrl || character.avatarUrl || undefined;
}

/**
 * 后台轮询视频生成状态
 */
async function pollVideoStatus(
  videoId: string,
  taskId: string,
  videoClient: any
) {
  const maxAttempts = 120;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;

      const status = await videoClient.getStatus(taskId);

      if (status.status === "completed") {
        await prisma.sceneVideo.update({
          where: { id: videoId },
          data: {
            status: "completed",
            videoUrl: status.videoUrl,
            thumbnailUrl: status.thumbnailUrl,
            duration: status.duration,
            metadata: {
              mode: "storyboard",
            },
          },
        });

        console.log(`Storyboard video generated successfully: ${videoId}`);
        break;
      } else if (status.status === "failed") {
        await prisma.sceneVideo.update({
          where: { id: videoId },
          data: {
            status: "failed",
            errorMessage: status.message || "视频生成失败",
          },
        });

        console.error(`Storyboard video generation failed: ${videoId}`);
        break;
      }
    } catch (error) {
      console.error(`Polling error for video ${videoId}:`, error);

      if (attempts >= maxAttempts) {
        await prisma.sceneVideo.update({
          where: { id: videoId },
          data: {
            status: "failed",
            errorMessage: "视频生成超时",
          },
        });
      }
    }
  }

  if (attempts >= maxAttempts) {
    await prisma.sceneVideo.update({
      where: { id: videoId },
      data: {
        status: "failed",
        errorMessage: "视频生成超时（超过 10 分钟）",
      },
    });
  }
}
