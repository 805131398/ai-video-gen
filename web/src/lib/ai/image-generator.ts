/**
 * 图片生成服务 - 调用 OpenAI 兼容 API
 */

import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma";

export interface ImageGenerateInput {
  prompt: string;
  negativePrompt?: string;
  count?: number;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  style?: "vivid" | "natural";
}

export interface ImageGenerateResult {
  imageUrl: string;
  revisedPrompt?: string;
  metadata?: {
    model?: string;
    size?: string;
  };
}

/**
 * 调用图片生成 API (OpenAI DALL-E 兼容)
 */
async function callImageAPI(
  apiUrl: string,
  apiKey: string,
  modelName: string,
  prompt: string,
  options: {
    n?: number;
    size?: string;
    style?: string;
  }
): Promise<{ url: string; revised_prompt?: string }[]> {
  const response = await fetch(`${apiUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      prompt,
      n: options.n || 1,
      size: options.size || "1024x1024",
      style: options.style || "vivid",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * 生成图片
 */
export async function generateImages(
  input: ImageGenerateInput,
  userId?: string,
  tenantId?: string
): Promise<ImageGenerateResult[]> {
  const config = await getEffectiveAIConfig(AIModelType.IMAGE, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的图片生成 AI 配置");
  }

  const count = input.count || 5;

  // 构建完整的提示词
  let fullPrompt = input.prompt;
  if (input.negativePrompt) {
    fullPrompt += `\n\nNegative prompt: ${input.negativePrompt}`;
  }

  // 由于大多数 API 单次生成数量有限，可能需要多次调用
  const results: ImageGenerateResult[] = [];
  const batchSize = Math.min(count, 4); // 大多数 API 单次最多 4 张
  const batches = Math.ceil(count / batchSize);

  for (let i = 0; i < batches; i++) {
    const remaining = count - results.length;
    const currentBatch = Math.min(batchSize, remaining);

    try {
      const images = await callImageAPI(
        config.apiUrl,
        config.apiKey,
        config.modelName,
        fullPrompt,
        {
          n: currentBatch,
          size: input.size,
          style: input.style,
        }
      );

      for (const img of images) {
        results.push({
          imageUrl: img.url,
          revisedPrompt: img.revised_prompt,
          metadata: {
            model: config.modelName,
            size: input.size || "1024x1024",
          },
        });
      }
    } catch (error) {
      console.error(`Batch ${i + 1} failed:`, error);
      // 继续尝试下一批
    }

    if (results.length >= count) break;
  }

  return results;
}

/**
 * 根据文案生成图片提示词
 */
export async function generateImagePromptFromCopy(
  copywriting: string,
  style?: string,
  userId?: string,
  tenantId?: string
): Promise<string> {
  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的文本生成 AI 配置");
  }

  const systemPrompt = `你是一个专业的 AI 图片提示词专家。请根据用户提供的短视频文案，生成适合的图片生成提示词。
要求：
- 提示词要用英文
- 描述要具体、视觉化
- 适合生成短视频配图
- 只输出提示词，不要其他内容
${style ? `\n风格要求：${style}` : ""}`;

  const response = await fetch(`${config.apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: copywriting },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}
