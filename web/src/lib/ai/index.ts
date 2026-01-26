/**
 * AI 客户端统一导出
 *
 * 支持 TEXT, IMAGE, VIDEO, VOICE 四种模型类型
 */

// 类型定义
export * from "./types/index";

// TEXT 客户端 (聊天/文本生成)
export { AIClient, createAIClient } from "./client";
export type { ChatMessage, ChatCompletionRequest, ChatCompletionResponse } from "./client";

// IMAGE 客户端 (图片生成)
export { ImageClient, createImageClient } from "./image-client";
export type { ImageGenerateRequest, ImageGenerateResponse } from "./image-client";

// VIDEO 客户端 (视频生成)
export { VideoClient, createVideoClient } from "./video-client";
export type { VideoGenerateRequest, VideoTaskResult } from "./video-client";

// VOICE 客户端 (语音合成)
export { VoiceClient, createVoiceClient } from "./voice-client";
export type { VoiceGenerateRequest, VoiceGenerateResponse } from "./voice-client";

// 文本生成服务
export { generateTitles, generateCopywriting } from "./text-generator";
export type { TitleGenerateInput, CopywritingGenerateInput, TextGenerateResult } from "./text-generator";

import { AIModelType } from "@/generated/prisma/enums";
import { createAIClient, AIClient } from "./client";
import { createImageClient, ImageClient } from "./image-client";
import { createVideoClient, VideoClient } from "./video-client";
import { createVoiceClient, VoiceClient } from "./voice-client";

/**
 * 根据模型类型创建对应的客户端
 */
export function createClientByType(
  modelType: AIModelType,
  config: {
    apiUrl: string;
    apiKey: string;
    modelName: string;
    config?: unknown;
  }
): AIClient | ImageClient | VideoClient | VoiceClient {
  switch (modelType) {
    case "TEXT":
      return createAIClient(config);
    case "IMAGE":
      return createImageClient(config);
    case "VIDEO":
      return createVideoClient(config);
    case "VOICE":
      return createVoiceClient(config);
    default:
      throw new Error(`不支持的模型类型: ${modelType}`);
  }
}
