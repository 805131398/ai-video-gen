/**
 * 图片生成服务 - 调用 OpenAI 兼容 API
 * 支持两种调用方式:
 * 1. 标准 DALL-E API (/v1/images/generations)
 * 2. bltcy - Chat Completions 格式 (/v1/chat/completions)
 */

import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";
import { translateText } from "./translator";

// bltcy 的 providerName 标识
const BLTCY_PROVIDER = "bltcy";
// bltcy API 域名标识
const BLTCY_API_HOST = "api.bltcy.ai";

/**
 * 判断是否为 bltcy API
 * 通过 providerName 或 apiUrl 来识别
 */
function isBltcyProvider(providerName: string, apiUrl: string): boolean {
  return providerName === BLTCY_PROVIDER || apiUrl.includes(BLTCY_API_HOST);
}

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
  console.log("[callImageAPI] 请求 URL:", apiUrl);

  const response = await fetch(apiUrl, {
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
 * 调用 bltcy - Chat Completions 格式的图片生成
 * 这种 API 使用 /v1/chat/completions 端点，通过特殊模型名触发图片生成
 */
async function callBltcyImageAPI(
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
  console.log("[callBltcyImageAPI] bltcy 请求 URL:", apiUrl);
  console.log("[callBltcyImageAPI] 模型:", modelName, "数量:", options.n || 1);

  const results: { url: string; revised_prompt?: string }[] = [];
  const count = options.n || 1;

  // bltcy 每次只能生成一张图片，需要多次调用
  for (let i = 0; i < count; i++) {
    console.log(`[callBltcyImageAPI] 开始生成第 ${i + 1}/${count} 张图片...`);

    const startTime = Date.now();
    // 图片生成可能需要较长时间，设置 2 分钟超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          stream: false,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      console.log(`[callBltcyImageAPI] 第 ${i + 1} 张响应状态: ${response.status}, 耗时: ${elapsed}ms`);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[callBltcyImageAPI] 第 ${i + 1} 张生成失败:`, error);
        throw new Error(`Bltcy Image API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      console.log(`[callBltcyImageAPI] 第 ${i + 1} 张响应数据:`, JSON.stringify(data).substring(0, 500));

      // 解析响应，图片 URL 通常在 choices[0].message.content 中
      const content = data.choices?.[0]?.message?.content;
      console.log(`[callBltcyImageAPI] 第 ${i + 1} 张 content:`, content?.substring(0, 300));

      if (content) {
        // 尝试从内容中提取图片 URL
        // 可能是直接的 URL，也可能是 markdown 格式 ![](url) 或包含 URL 的文本
        const urls = extractImageUrls(content);
        console.log(`[callBltcyImageAPI] 第 ${i + 1} 张提取到 ${urls.length} 个 URL:`, urls);
        for (const url of urls) {
          results.push({ url, revised_prompt: prompt });
        }
      } else {
        console.warn(`[callBltcyImageAPI] 第 ${i + 1} 张没有找到 content`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        console.error(`[callBltcyImageAPI] 第 ${i + 1} 张生成超时 (120s)`);
        throw new Error(`Bltcy Image API timeout after 120s`);
      }
      throw error;
    }
  }

  console.log(`[callBltcyImageAPI] 完成，共生成 ${results.length} 张图片`);
  return results;
}

/**
 * 从文本内容中提取图片 URL
 */
function extractImageUrls(content: string): string[] {
  const urls: string[] = [];

  // 匹配 markdown 图片格式 ![...](url)
  const markdownRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = markdownRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  // 如果没有找到 markdown 格式，尝试匹配普通 URL
  if (urls.length === 0) {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:png|jpg|jpeg|gif|webp|bmp)[^\s<>"{}|\\^`\[\]]*)/gi;
    while ((match = urlRegex.exec(content)) !== null) {
      urls.push(match[1]);
    }
  }

  // 如果还是没有找到，检查内容本身是否就是一个 URL
  if (urls.length === 0 && content.startsWith("http")) {
    const trimmed = content.trim();
    if (trimmed.match(/^https?:\/\/[^\s]+$/)) {
      urls.push(trimmed);
    }
  }

  return urls;
}

/**
 * 生成单张图片（用于逐张生成场景）
 */
export async function generateSingleImage(
  input: ImageGenerateInput,
  userId?: string,
  tenantId?: string
): Promise<ImageGenerateResult | null> {
  const config = await getEffectiveAIConfig(AIModelType.IMAGE, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的图片生成 AI 配置");
  }

  // 构建完整的提示词
  let fullPrompt = input.prompt;
  if (input.negativePrompt) {
    fullPrompt += `\n\nNegative prompt: ${input.negativePrompt}`;
  }

  // 判断是否使用 bltcy
  const isBltcyAPI = isBltcyProvider(config.providerName, config.apiUrl);

  try {
    const images = isBltcyAPI
      ? await callBltcyImageAPI(
          config.apiUrl,
          config.apiKey,
          config.modelName,
          fullPrompt,
          { n: 1, size: input.size, style: input.style }
        )
      : await callImageAPI(
          config.apiUrl,
          config.apiKey,
          config.modelName,
          fullPrompt,
          { n: 1, size: input.size, style: input.style }
        );

    if (images.length > 0) {
      return {
        imageUrl: images[0].url,
        revisedPrompt: images[0].revised_prompt,
        metadata: {
          model: config.modelName,
          size: input.size || "1024x1024",
        },
      };
    }
  } catch (error) {
    console.error("[generateSingleImage] 生成失败:", error);
    throw error;
  }

  return null;
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

  console.log("[generateImages] 图片 AI 配置:", {
    hasConfig: !!config,
    modelType: AIModelType.IMAGE,
    providerName: config?.providerName,
    apiUrl: config?.apiUrl,
    modelName: config?.modelName,
  });

  if (!config) {
    throw new Error("未找到可用的图片生成 AI 配置");
  }

  const count = input.count || 5;

  // 构建完整的提示词
  let fullPrompt = input.prompt;
  if (input.negativePrompt) {
    fullPrompt += `\n\nNegative prompt: ${input.negativePrompt}`;
  }

  // 判断是否使用 bltcy
  const isBltcyAPI = isBltcyProvider(config.providerName, config.apiUrl);

  // 由于大多数 API 单次生成数量有限，可能需要多次调用
  const results: ImageGenerateResult[] = [];
  // bltcy 每次只能生成1张，标准 API 最多4张
  const batchSize = isBltcyAPI ? 1 : Math.min(count, 4);
  const batches = Math.ceil(count / batchSize);

  for (let i = 0; i < batches; i++) {
    const remaining = count - results.length;
    const currentBatch = Math.min(batchSize, remaining);

    try {
      // 根据服务商选择不同的调用方式
      const images = isBltcyAPI
        ? await callBltcyImageAPI(
            config.apiUrl,
            config.apiKey,
            config.modelName,
            fullPrompt,
            {
              n: currentBatch,
              size: input.size,
              style: input.style,
            }
          )
        : await callImageAPI(
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
 * 根据文案生成图片提示词（双语）
 */
export async function generateImagePromptFromCopy(
  copywriting: string,
  style?: string,
  userId?: string,
  tenantId?: string
): Promise<{ prompt: string; translation: string }> {
  console.log("[generateImagePromptFromCopy] 开始生成图片提示词", {
    copywriting: copywriting?.substring(0, 50),
    style,
    userId,
    tenantId,
  });

  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  console.log("[generateImagePromptFromCopy] AI 配置:", {
    hasConfig: !!config,
    apiUrl: config?.apiUrl,
    modelName: config?.modelName,
    hasApiKey: !!config?.apiKey,
  });

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

  console.log("[generateImagePromptFromCopy] 请求 URL:", config.apiUrl);

  const response = await fetch(config.apiUrl, {
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
    const errorText = await response.text();
    console.error("[generateImagePromptFromCopy] API 错误:", {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const prompt = data.choices[0]?.message?.content || "";

  // 自动翻译为中文
  console.log("[generateImagePromptFromCopy] 开始翻译提示词为中文...");
  const translation = await translateText(prompt, 'en-zh', userId, tenantId);
  console.log("[generateImagePromptFromCopy] 翻译完成:", translation?.substring(0, 50));

  return { prompt, translation };
}
