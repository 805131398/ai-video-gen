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
  withVoice?: boolean;
  voiceLanguage?: "zh" | "en";
}

export interface BilingualPrompt {
  en: string;
  zh: string;
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
  characters: ProjectCharacter[],
  withVoice?: boolean,
  voiceLanguage?: "zh" | "en"
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

  // 组合格式
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

  // 5. 对话（根据声音设置决定）
  if (withVoice !== false && content.dialogues && content.dialogues.length > 0) {
    if (voiceLanguage === "en") {
      // 英文语音：台词保持原文
      const dialogueText = content.dialogues
        .map((d) => `${d.speaker}: "${d.text}"`)
        .join("; ");
      parts.push(`[Dialogue] ${dialogueText}`);
    } else {
      // 中文语音（默认）：英文指令 + 中文台词
      const dialogueText = content.dialogues
        .map((d) => `${d.speaker}: "${d.text}"`)
        .join("; ");
      parts.push(`[Speaking in Chinese] ${dialogueText}`);
    }
    parts.push(
      "The character must be shown speaking on screen with matching lip movements"
    );
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
 * 先组合基础信息，然后调用 AI 优化 prompt，返回中英双语
 */
export async function buildAIOptimizedPrompt(
  scene: ScriptScene,
  characters: ProjectCharacter[],
  userId?: string,
  tenantId?: string,
  withVoice?: boolean,
  voiceLanguage?: "zh" | "en"
): Promise<BilingualPrompt> {
  const basePrompt = buildSmartCombinePrompt(scene, characters, withVoice, voiceLanguage);
  const optimized = await optimizePromptForVideo(basePrompt, userId, tenantId, withVoice, voiceLanguage);
  return optimized;
}

/**
 * 使用 AI 优化视频生成 prompt
 * 将场景信息转换为更适合视频生成的专业描述，返回中英双语
 */
async function optimizePromptForVideo(
  basePrompt: string,
  userId?: string,
  tenantId?: string,
  withVoice?: boolean,
  voiceLanguage?: "zh" | "en"
): Promise<BilingualPrompt> {
  const fallback: BilingualPrompt = { en: basePrompt, zh: "" };
  const startTime = Date.now();

  try {
    const config = await getEffectiveAIConfig(
      AIModelType.TEXT,
      userId,
      tenantId
    );

    if (!config) {
      console.warn("未找到 TEXT 类型的 AI 配置，返回基础 prompt");
      return fallback;
    }

    const client = createAIClient({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
      config: config.config as Record<string, unknown> | undefined,
    });

    // 根据声音设置构建额外规则
    let voiceRules: string;
    if (withVoice === false) {
      voiceRules = `9. This is a silent/visual-only video. Do NOT include any dialogue or spoken text. Focus entirely on visual storytelling, actions, and cinematography.`;
    } else if (voiceLanguage === "en") {
      voiceRules = `9. This video requires voice acting. You MUST include ALL character dialogues using this exact format: [Dialogue] CharacterName: "dialogue content"
10. The character MUST be shown speaking on screen with matching lip movements
11. Preserve the dialogue content exactly as provided, do not omit or summarize it`;
    } else {
      // 默认中文语音
      voiceRules = `9. This video requires voice acting in Chinese. You MUST include ALL character dialogues using this exact format: [Speaking in Chinese] CharacterName: "台词内容"
10. The character MUST be shown speaking on screen with matching lip movements
11. All spoken dialogue must be in Chinese (Mandarin). Do NOT translate the Chinese dialogue to English
12. Keep the dialogue text in its original Chinese form within quotes`;
    }

    const systemPrompt = `You are a professional video prompt engineer specializing in AI video generation (Kling, Sora, Runway, etc.).

Your task: transform a structured scene description into a vivid, cinematic video generation prompt, and provide both English and Chinese versions.

Rules:
1. Use professional cinematic terminology: shot types (close-up, wide shot, tracking shot), camera movements (dolly in, crane up, pan left), lighting terms (rim light, chiaroscuro, golden hour glow)
2. Add rich visual details: textures, colors, atmosphere, depth of field, motion blur
3. Keep the core scene content (characters, actions, dialogues, mood) intact
4. Write as a single flowing paragraph, no bullet points or labels
5. Keep each version under 300 words
6. Be creative — each time you write, vary the descriptive details and word choices while preserving the scene's meaning
7. The Chinese version should be a natural Chinese expression of the same content, NOT a literal translation
8. Output ONLY a valid, complete JSON object with "en" and "zh" keys, no other text or markdown formatting. Ensure the JSON is properly closed and not truncated
${voiceRules}

Example output format:
{"en": "A cinematic wide shot...", "zh": "一个电影感的广角镜头..."}`;

    const userPrompt = `Transform this scene description into a cinematic video generation prompt (both English and Chinese):\n\n${basePrompt}`;

    const rawResult = await client.generateText(userPrompt, systemPrompt, {
      temperature: 0.8,
      maxTokens: 2048,
    });

    const trimmed = rawResult.trim();

    // 尝试解析 JSON
    let result: BilingualPrompt;
    try {
      // 处理可能被 markdown 代码块包裹的情况
      const jsonStr = trimmed
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, "");
      const parsed = JSON.parse(jsonStr);
      if (parsed.en && typeof parsed.en === "string") {
        result = {
          en: parsed.en.trim(),
          zh: (parsed.zh || "").trim(),
        };
      } else {
        console.warn("AI 返回 JSON 缺少 en 字段，降级处理");
        result = { en: trimmed, zh: "" };
      }
    } catch {
      console.warn("AI 返回非 JSON 格式，降级处理");
      result = { en: trimmed, zh: "" };
    }

    if (!result.en) {
      console.warn("AI 返回空结果，降级使用基础 prompt");
      return fallback;
    }

    // 记录成功日志
    await logAIUsage({
      tenantId: tenantId || null,
      userId: userId || "",
      modelType: "TEXT",
      modelConfigId: config.id,
      inputTokens: estimateTokenCount(systemPrompt + userPrompt),
      outputTokens: estimateTokenCount(trimmed),
      cost: 0.01,
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
        tenantId: tenantId || null,
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

    return fallback;
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
 * smart_combine 返回英文字符串，ai_optimized 返回中英双语
 */
export async function buildVideoPrompt(
  options: PromptBuildOptions
): Promise<BilingualPrompt> {
  const { type, scene, characters, userId, tenantId, withVoice, voiceLanguage } = options;

  if (type === "smart_combine") {
    const en = buildSmartCombinePrompt(scene, characters, withVoice, voiceLanguage);
    return { en, zh: "" };
  } else if (type === "ai_optimized") {
    return await buildAIOptimizedPrompt(scene, characters, userId, tenantId, withVoice, voiceLanguage);
  }

  throw new Error(`Unknown prompt type: ${type}`);
}
