import { ScriptScene } from "@/generated/prisma/client";
import { ProjectCharacter } from "@/generated/prisma/client";

export interface PromptBuildOptions {
  type: "smart_combine" | "ai_optimized";
  scene: ScriptScene;
  characters: ProjectCharacter[];
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
  characters: ProjectCharacter[]
): Promise<string> {
  const basePrompt = buildSmartCombinePrompt(scene, characters);

  // 调用 AI 优化 prompt
  const optimized = await optimizePromptForVideo(basePrompt);
  return optimized;
}

/**
 * 使用 AI 优化视频生成 prompt
 * 将场景信息转换为更适合视频生成的专业描述
 */
async function optimizePromptForVideo(basePrompt: string): Promise<string> {
  try {
    // 这里调用文本生成 AI 来优化 prompt
    // 可以使用 OpenAI、Claude 等模型
    const systemPrompt = `You are a professional video prompt engineer. Your task is to optimize prompts for AI video generation.

Given a scene description, transform it into a concise, professional video generation prompt that:
1. Uses cinematic language
2. Focuses on visual elements
3. Removes redundant information
4. Maintains key details (characters, actions, mood, lighting)
5. Is optimized for AI video generation models like Sora, Runway, or Kling

Keep the prompt under 200 words and make it vivid and specific.`;

    const userPrompt = `Optimize this scene description for video generation:\n\n${basePrompt}`;

    // TODO: 实际调用 AI API
    // 这里需要集成实际的 AI 服务
    // 暂时返回基础 prompt
    console.log("AI optimization not implemented yet, using base prompt");
    return basePrompt;

    // 示例实现（需要实际的 AI 配置）:
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [
    //       { role: 'system', content: systemPrompt },
    //       { role: 'user', content: userPrompt }
    //     ],
    //     temperature: 0.7,
    //     max_tokens: 300
    //   })
    // });
    // const data = await response.json();
    // return data.choices[0].message.content;
  } catch (error) {
    console.error("Failed to optimize prompt with AI:", error);
    // 如果优化失败，返回基础 prompt
    return basePrompt;
  }
}

/**
 * 构建视频生成 prompt
 * 根据指定的类型构建 prompt
 */
export async function buildVideoPrompt(
  options: PromptBuildOptions
): Promise<string> {
  const { type, scene, characters } = options;

  if (type === "smart_combine") {
    return buildSmartCombinePrompt(scene, characters);
  } else if (type === "ai_optimized") {
    return await buildAIOptimizedPrompt(scene, characters);
  }

  throw new Error(`Unknown prompt type: ${type}`);
}
