/**
 * 翻译服务 - 支持双向翻译（英译中、中译英）
 */

import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";
import { createAIClient } from "./client";
import { logAIUsage } from "@/lib/services/ai-usage-service";

/**
 * 翻译文本
 * @param text 要翻译的文本
 * @param direction 翻译方向：'en-zh' 英译中，'zh-en' 中译英
 * @param userId 用户ID（可选）
 * @param tenantId 租户ID（可选）
 * @returns 翻译后的文本
 */
export async function translateText(
  text: string,
  direction: 'en-zh' | 'zh-en',
  userId?: string,
  tenantId?: string
): Promise<string> {
  const startTime = Date.now();

  // 获取 AI 配置
  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的文本生成 AI 配置");
  }

  // 根据翻译方向设置系统提示词
  const systemPrompt = direction === 'en-zh'
    ? "你是专业的英译中翻译专家。请将英文翻译成中文，保持原意，使用自然流畅的中文表达。只输出翻译结果。"
    : "你是专业的中译英翻译专家。请将中文翻译成英文，保持原意，使用自然流畅的英文表达。只输出翻译结果。";

  try {
    // 创建 AI 客户端并调用
    const client = createAIClient(config);
    const result = await client.generateText(text, systemPrompt, {
      temperature: 0.3, // 较低的温度以保证翻译准确性
    });

    const translation = result.trim();

    // 记录成功日志
    await logAIUsage({
      tenantId: tenantId || "",
      userId: userId || "",
      modelType: "TEXT",
      modelConfigId: config.id,
      inputTokens: estimateTokenCount(text + systemPrompt),
      outputTokens: estimateTokenCount(translation),
      cost: 0.01,
      latencyMs: Date.now() - startTime,
      status: "SUCCESS",
      taskId: `translate-${direction}-${Date.now()}`,
      requestUrl: config.apiUrl,
      requestBody: { text, direction, systemPrompt },
      responseBody: { translation },
    });

    return translation;
  } catch (error) {
    // 记录失败日志
    await logAIUsage({
      tenantId: tenantId || "",
      userId: userId || "",
      modelType: "TEXT",
      modelConfigId: config.id,
      inputTokens: estimateTokenCount(text + systemPrompt),
      outputTokens: 0,
      cost: 0,
      latencyMs: Date.now() - startTime,
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      taskId: `translate-${direction}-${Date.now()}`,
      requestUrl: config.apiUrl,
      requestBody: { text, direction, systemPrompt },
    });

    throw error;
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
