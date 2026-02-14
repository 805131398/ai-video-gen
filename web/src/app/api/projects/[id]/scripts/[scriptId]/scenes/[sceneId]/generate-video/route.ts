import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { buildVideoPrompt } from "@/lib/services/video-prompt-builder";
import { createVideoClient } from "@/lib/ai/video-client";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { pollVideoStatus } from "@/lib/services/video-polling-service";
import { logAIUsage } from "@/lib/services/ai-usage-service";

interface GenerateSceneVideoRequest {
  promptType?: "smart_combine" | "ai_optimized";
  referenceImage?: string; // 参考图 URL
  aspectRatio?: string; // 宽高比，如 "16:9", "9:16", "1:1"
  duration?: number; // 时长（秒）
  hd?: boolean; // 是否高清
  useStoryboard?: boolean; // 是否使用故事板格式
  useCharacterImage?: boolean; // 是否使用角色形象作为参考图（仅当 useStoryboard=true 时有效）
  customPrompt?: string; // 用户编辑后的提示词（如果传了则直接使用）
  withVoice?: boolean; // 是否包含台词/声音
  voiceLanguage?: "zh" | "en"; // 台词语言
}

/**
 * POST /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId]/generate-video
 * 为单个场景生成视频（使用 bltcy 视频适配器）
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
    const body: GenerateSceneVideoRequest = await request.json();
    const promptType = body.promptType || "smart_combine";
    const useStoryboard = body.useStoryboard || false;
    const useCharacterImage = body.useCharacterImage !== false; // 默认 true
    const withVoice = body.withVoice !== false; // 默认 true
    const voiceLanguage = body.voiceLanguage || "zh"; // 默认中文

    // 2. 验证场景是否存在
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

    // 3. 计算视频时长（Sora 只支持 10s 和 15s）
    const requestedDuration = body.duration || scene.duration || 10;
    // 12s 及以下使用 10s，13s 及以上使用 15s
    const finalDuration = requestedDuration <= 12 ? 10 : 15;

    console.log("[generate-video] 时长计算:", {
      requestedDuration,
      finalDuration,
      note: "Sora 只支持 10s 和 15s",
    });

    // 4. 构建 prompt
    let prompt: string;
    let finalReferenceImage: string | undefined = body.referenceImage;
    let characterImageInfo: CharacterImageResult = {};

    if (body.customPrompt) {
      // 用户提供了自定义提示词，直接使用
      prompt = body.customPrompt;

      // 仍然需要获取角色形象作为参考图
      if (useCharacterImage && !finalReferenceImage) {
        characterImageInfo = await getCharacterImage(
          scene,
          scene.script.project.characters
        );
        finalReferenceImage = characterImageInfo.imageUrl;
      }
    } else if (useStoryboard) {
      // 使用故事板格式（传入计算后的时长）
      prompt = buildSceneStoryboardPrompt(scene, finalDuration);

      // 如果启用了角色形象，自动获取
      if (useCharacterImage && !finalReferenceImage) {
        characterImageInfo = await getCharacterImage(
          scene,
          scene.script.project.characters
        );
        finalReferenceImage = characterImageInfo.imageUrl;
      }
    } else {
      // 使用普通格式
      const builtPrompt = await buildVideoPrompt({
        type: promptType,
        scene,
        characters: scene.script.project.characters,
        userId: user.id,
        tenantId: user.tenantId,
        withVoice,
        voiceLanguage,
      });
      prompt = builtPrompt.en;

      // 单独生成模式也支持角色形象
      if (useCharacterImage && !finalReferenceImage) {
        characterImageInfo = await getCharacterImage(
          scene,
          scene.script.project.characters
        );
        finalReferenceImage = characterImageInfo.imageUrl;
      }
    }

    // 5. 获取视频生成配置（bltcy）
    const videoConfig = await getEffectiveAIConfig("VIDEO", user.id, user.tenantId);
    if (!videoConfig) {
      return NextResponse.json(
        { error: "未配置视频生成服务" },
        { status: 500 }
      );
    }

    // 6. 创建视频记录（状态为 pending）
    const sceneVideo = await prisma.sceneVideo.create({
      data: {
        sceneId: scene.id,
        videoUrl: "", // 暂时为空，生成完成后更新
        prompt,
        promptType: useStoryboard ? `${promptType}_storyboard` : promptType,
        status: "pending",
        metadata: {
          mode: useStoryboard ? "storyboard" : "normal",
          useCharacterImage,
          referenceImage: finalReferenceImage,
          characterId: characterImageInfo.characterId,
          characterName: characterImageInfo.characterName,
          digitalHumanId: characterImageInfo.digitalHumanId,
          imageSource: characterImageInfo.source,
          aspectRatio: body.aspectRatio || "16:9",
          hd: body.hd || false,
        },
      },
    });

    // 7. 调用 bltcy 视频适配器生成视频
    try {
      // 创建视频客户端
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
      const submitStartTime = Date.now();
      const submitParams = {
        prompt,
        imageUrl: finalReferenceImage,
        duration: finalDuration,
        aspectRatio: body.aspectRatio || "16:9",
      };
      const result = await videoClient.submit(submitParams);
      const submitLatency = Date.now() - submitStartTime;

      // 更新任务 ID
      await prisma.sceneVideo.update({
        where: { id: sceneVideo.id },
        data: { taskId: result.taskId },
      });

      // 记录提交请求日志
      await logAIUsage({
        tenantId: user.tenantId || null,
        userId: user.id,
        projectId,
        modelType: "VIDEO",
        modelConfigId: videoConfig.id,
        inputTokens: prompt.length,
        outputTokens: 0,
        cost: 0,
        latencyMs: submitLatency,
        status: "SUCCESS",
        taskId: result.taskId,
        requestUrl: videoConfig.apiUrl,
        requestBody: {
          type: "submit",
          ...submitParams,
          sceneId: scene.id,
          videoId: sceneVideo.id,
        },
        responseBody: {
          type: "submit",
          taskId: result.taskId,
        },
      });

      // 8. 启动后台轮询任务
      pollVideoStatus(sceneVideo.id, result.taskId, videoClient).catch(
        (error) => {
          console.error("Background polling failed:", error);
        }
      );

      // 9. 返回任务信息
      return NextResponse.json({
        success: true,
        message: "视频生成任务已提交",
        mode: useStoryboard ? "storyboard" : "normal",
        videoId: sceneVideo.id,
        taskId: result.taskId,
        sceneId: scene.id,
        sceneTitle: scene.title,
        referenceImage: finalReferenceImage,
      });
    } catch (error) {
      const submitErrorMsg = error instanceof Error ? error.message : "未知错误";

      // 生成失败，更新状态
      await prisma.sceneVideo.update({
        where: { id: sceneVideo.id },
        data: {
          status: "failed",
          errorMessage: submitErrorMsg,
        },
      });

      // 记录提交失败日志
      await logAIUsage({
        tenantId: user.tenantId || null,
        userId: user.id,
        projectId,
        modelType: "VIDEO",
        modelConfigId: videoConfig.id,
        inputTokens: prompt.length,
        outputTokens: 0,
        cost: 0,
        latencyMs: 0,
        status: "FAILED",
        errorMessage: submitErrorMsg,
        requestUrl: videoConfig.apiUrl,
        requestBody: {
          type: "submit",
          prompt,
          duration: finalDuration,
          aspectRatio: body.aspectRatio || "16:9",
          sceneId: scene.id,
          videoId: sceneVideo.id,
        },
      });

      throw error;
    }
  } catch (error) {
    console.error("Generate scene video error:", error);
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
function buildSceneStoryboardPrompt(scene: any, finalDuration: number): string {
  const content = scene.content as any;

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
  return `Shot 1:\nduration: ${finalDuration}sec\nScene: ${sceneDescription}`;
}

/**
 * 角色形象查询结果
 */
interface CharacterImageResult {
  imageUrl?: string;
  characterId?: string;
  characterName?: string;
  digitalHumanId?: string;
  source?: "digital_human" | "avatar" | undefined;
}

/**
 * 获取场景主要角色的数字人形象及关联信息
 */
async function getCharacterImage(
  scene: any,
  characters: any[]
): Promise<CharacterImageResult> {
  const content = scene.content as any;
  const characterId = content.characterId;

  console.log("[getCharacterImage] 开始查找角色形象:", {
    sceneId: scene.id,
    characterId,
    charactersCount: characters.length,
    characterIds: characters.map((c: any) => c.id),
  });

  if (!characterId) {
    console.log("[getCharacterImage] 场景没有关联角色");
    return {};
  }

  // 查找角色
  const character = characters.find((c: any) => c.id === characterId);
  if (!character) {
    console.log("[getCharacterImage] 未找到角色:", characterId);
    return {};
  }

  console.log("[getCharacterImage] 找到角色:", {
    characterId: character.id,
    characterName: character.name,
    avatarUrl: character.avatarUrl,
    attributes: character.attributes,
  });

  // 从角色属性中获取选中的数字人 ID
  const selectedDigitalHumanId = (character.attributes as any)?.digitalHumanId as string | undefined;

  console.log("[getCharacterImage] 选中的数字人ID:", selectedDigitalHumanId);

  let digitalHumanImageUrl: string | undefined;
  let usedDigitalHumanId: string | undefined;

  if (selectedDigitalHumanId) {
    // 根据 ID 查询数字人形象
    const digitalHuman = await prisma.digitalHuman.findUnique({
      where: {
        id: selectedDigitalHumanId,
      },
    });

    console.log("[getCharacterImage] 数字人形象查询结果:", {
      found: !!digitalHuman,
      imageUrl: digitalHuman?.imageUrl,
    });

    digitalHumanImageUrl = digitalHuman?.imageUrl;
    if (digitalHuman) {
      usedDigitalHumanId = digitalHuman.id;
    }
  } else {
    // 如果没有选中的，查询该角色的第一个数字人
    const firstDigitalHuman = await prisma.digitalHuman.findFirst({
      where: {
        characterId: character.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log("[getCharacterImage] 未选中数字人，使用最新的:", {
      found: !!firstDigitalHuman,
      imageUrl: firstDigitalHuman?.imageUrl,
    });

    digitalHumanImageUrl = firstDigitalHuman?.imageUrl;
    if (firstDigitalHuman) {
      usedDigitalHumanId = firstDigitalHuman.id;
    }
  }

  // 确定最终使用的图片和来源
  let finalImageUrl: string | undefined;
  let source: "digital_human" | "avatar" | undefined;

  if (digitalHumanImageUrl) {
    finalImageUrl = digitalHumanImageUrl;
    source = "digital_human";
  } else if (character.avatarUrl) {
    finalImageUrl = character.avatarUrl;
    source = "avatar";
  }

  console.log("[getCharacterImage] 最终返回:", {
    imageUrl: finalImageUrl,
    characterName: character.name,
    digitalHumanId: usedDigitalHumanId,
    source,
  });

  return {
    imageUrl: finalImageUrl,
    characterId: character.id,
    characterName: character.name,
    digitalHumanId: usedDigitalHumanId,
    source,
  };
}
