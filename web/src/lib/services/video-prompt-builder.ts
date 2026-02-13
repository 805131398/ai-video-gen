import { ScriptScene } from "@/generated/prisma/client";
import { ProjectCharacter } from "@/generated/prisma/client";
import { AIModelType } from "@/generated/prisma/enums";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { createAIClient } from "@/lib/ai/client";
import { logAIUsage } from "@/lib/services/ai-usage-service";

export interface PromptBuildOptions {
  type: "smart_combine" | "ai_optimized";
  scene: ScriptScene;
  characters: ProjectCharacter[];
  userId?: string;
  tenantId?: string;
}

export interface SceneContent {
  description: string;
  characterId: string;
  otherCharacters?: Array<{
    characterId: string;
    role: string;
  }>;
  actions: {
    entrance: string;
    main: string;
    exit: string;
  };
  dialogues: Array<{
    text: string;
    speaker: string;
  }>;
  camera: {
    type: "fixed" | "follow" | "orbit" | "handheld";
    movement: "push" | "pull" | "pan" | "tilt" | "dolly";
    shotSize: "closeup" | "close" | "medium" | "full" | "wide";
    description: string;
  };
  visual: {
    lighting: "daylight" | "night" | "indoor" | "golden" | "overcast";
    mood: "warm" | "cool" | "vintage" | "vibrant" | "muted";
    effects: string;
    description: string;
  };
  audio: {
    bgMusic: string;
    soundEffects: string;
    volume: number;
  };
}

/**
 * 方式 B：智能组合多个字段
 * 将场景的各个字段组合成完整的 prompt
 */
export function buildSmartCombinePrompt(
  scene: ScriptScene,
  characters: ProjectCharacter[]
): string {
  const content = scene.content as SceneContent;

  // 获取主要角色信息
  const mainCharacter = characters.find((c) => c.id === content.characterId);
  const mainCharacterName = mainCharacter?.name || "角色";

  // 获取其他角色信息
  const otherCharacterNames =
    content.otherCharacters
      ?.map((oc) => {
        const char = characters.find((c) => c.id === oc.characterId);
        return char ? `${char.name}(${oc.role})` : null;
      })
      .filter(Boolean)
      .join(", ") || "";

  // 组合格式：[镜头] [场景描述] [角色] [动作] [对话] [视觉效果] [光照]
  const parts: string[] = [];

  // 1. 镜头信息
  parts.push(
    `${content.camera.shotSize} ${content.camera.type} shot, ${content.camera.movement} movement`
  );

  // 2. 场景描述
  parts.push(content.description);

  // 3. 角色信息
  if (otherCharacterNames) {
    parts.push(`Characters: ${mainCharacterName} and ${otherCharacterNames}`);
  } else {
    parts.push(`Character: ${mainCharacterName}`);
  }

  // 4. 动作描述
  if (content.actions.main) {
    parts.push(`Action: ${content.actions.main}`);
  }

  // 5. 对话（如果有）
  if (content.dialogues && content.dialogues.length > 0) {
    const dialogueText = content.dialogues
      .map((d) => `${d.speaker}: "${d.text}"`)
      .join("; ");
    parts.push(`Dialogue: ${dialogueText}`);
  }

  // 6. 视觉效果
  parts.push(
    `Visual: ${content.visual.mood} mood, ${content.visual.lighting} lighting`
  );

  // 7. 特效（如果有）
  if (content.visual.effects) {
    parts.push(`Effects: ${content.visual.effects}`);
  }

  // 8. 镜头描述（如果有）
  if (content.camera.description) {
    parts.push(`Camera: ${content.camera.description}`);
  }

  // 9. 视觉描述（如果有）
  if (content.visual.description) {
    parts.push(`Visual details: ${content.visual.description}`);
  }

  return parts.filter(Boolean).join(". ");
}

/**
 * 方式 C：AI 优化 prompt
 * 先组合基础信息，然后调用 AI 优化 prompt
 */
export async function buildAIOptimizedPrompt(
  scene: ScriptScene,
  characters: ProjectCharacter[],
  userId?: string,
  tenantId?: string
): Promise<string> {
  const basePrompt = buildSmartCombinePrompt(scene, characters);
  const optimized = await optimizePromptForVideo(basePrompt, userId, tenantId);
  return optimized;
}

/**
 * 使用 AI 优化视频生成 prompt
 * 将场景信息转换为更适合视频生成的专业描述
 */
async function optimizePromptForVideo(
  basePrompt: string,
  userId?: string,
  tenantId?: string
): Promise<string> {
  const startTime = Date.now();

  try {
    const config = await getEffectiveAIConfig(
      AIModelType.TEXT,
      userId,
      tenantId
    );

    if (!config) {
      console.warn("未找到 TEXT 类型的 AI 配置，返回基础 prompt");
      return basePrompt;
    }

    const client = createAIClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
      config: config.config as Record<string, unknown> | undefined,
    });

    const systemPrompt = `You are a professional video prompt engineer specializing in AI video generation (Kling, Sora, Runway, etc.).

Your task: transform a structured scene description into a vivid, cinematic video generation prompt.

Rules:
1. Output in English only
2. Use professional cinematic terminology: shot types (close-up, wide shot, tracking shot), camera movements (dolly in, crane up, pan left), lighting terms (rim light, chiaroscuro, golden hour glow)
3. Add rich visual details: textures, colors, atmosphere, depth of field, motion blur
4. Keep the core scene content (characters, actions, dialogues, mood) intact
5. Write as a single flowing paragraph, no bullet points or labels
6. Keep it under 200 words
7. Be creative — each time you write, vary the descriptive details and word choices while preserving the scene's meaning
8. Do NOT include any explanation or preamble, output the prompt only`;

    const userPrompt = `Transform this scene description into a cinematic video generation prompt:\n\n${basePrompt}`;

    const optimized = await client.generateText(userPrompt, systemPrompt, {
      temperature: 0.8,
      maxTokens: 400,
    });

    const result = optimized.trim();
    if (!result) {
      console.warn("AI 返回空结果，降级使用基础 prompt");
      return basePrompt;
    }

    // 记录成功日志
    await logAIUsage({
      tenantId: tenantId || "",
      userId: userId || "",
      modelType: "TEXT",
      modelConfigId: config.id,
      inputTokens: estimateTokenCount(systemPrompt + userPrompt),
      outputTokens: estimateTokenCount(result),
      cost: 0.01, // TEXT 类型成本
      latencyMs: Date.now() - startTime,
      status: "SUCCESS",
      taskId: `video-prompt-optimize-${Date.now()}`,
      requestUrl: config.apiUrl,
      requestBody: { systemPrompt, userPrompt, basePrompt },
      responseBody: { optimizedPrompt: result },
    });

    return result;
  } catch (error) {
    console.error("AI 优化 prompt 失败，降级使用基础 prompt:", error);

    // 记录失败日志
    const config = await getEffectiveAIConfig(
      AIModelType.TEXT,
      userId,
      tenantId
    );
    if (config) {
      await logAIUsage({
        tenantId: tenantId || "",
        userId: userId || "",
        modelType: "TEXT",
        modelConfigId: config.id,
        inputTokens: estimateTokenCount(basePrompt),
        outputTokens: 0,
        cost: 0,
        latencyMs: Date.now() - startTime,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        taskId: `video-prompt-optimize-${Date.now()}`,
        requestUrl: config.apiUrl,
        requestBody: { basePrompt },
      });
    }

    return basePrompt;
  }
}

/**
 * Token 估算函数
 */
function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * 构建视频生成 prompt
 * 根据指定的类型构建 prompt
 */
export async function buildVideoPrompt(
  options: PromptBuildOptions
): Promise<string> {
  const { type, scene, characters, userId, tenantId } = options;

  if (type === "smart_combine") {
    return buildSmartCombinePrompt(scene, characters);
  } else if (type === "ai_optimized") {
    return await buildAIOptimizedPrompt(scene, characters, userId, tenantId);
  }

  throw new Error(`Unknown prompt type: ${type}`);
}
