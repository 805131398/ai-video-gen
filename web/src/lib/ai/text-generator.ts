/**
 * 文本生成服务 - 支持多种 AI 提供商
 */

import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma";
import { createAIClient } from "./client";

export interface TitleGenerateInput {
  topic: string;
  count?: number;
  style?: string;
  keywords?: string[];
}

export interface CopywritingGenerateInput {
  topic: string;
  title: string;
  count?: number;
  attributes?: {
    perspective?: string; // 人称视角
    role?: string; // 角色设定
    gender?: string; // 性别
    age?: string; // 年龄
    purpose?: string; // 目的
    emotion?: string; // 情绪
    style?: string; // 风格
    duration?: string; // 时长
    audience?: string; // 受众
  };
}

export interface TextGenerateResult {
  content: string;
  metadata?: {
    tokens?: number;
    model?: string;
  };
}

/**
 * 生成标题
 */
export async function generateTitles(
  input: TitleGenerateInput,
  userId?: string,
  tenantId?: string
): Promise<TextGenerateResult[]> {
  console.log("[generateTitles] 开始获取 AI 配置...", { userId, tenantId });

  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  if (!config) {
    console.error("[generateTitles] 未找到 AI 配置");
    throw new Error("未找到可用的文本生成 AI 配置");
  }

  console.log("[generateTitles] 获取到 AI 配置:", {
    id: config.id,
    providerName: config.providerName,
    modelName: config.modelName,
    apiUrl: config.apiUrl,
    hasApiKey: !!config.apiKey,
    apiKeyPrefix: config.apiKey?.substring(0, 8) + "...",
    config: config.config,
  });

  const count = input.count || 5;
  const systemPrompt = `你是抖音/小红书爆款标题创作专家。

任务：根据用户给的主题词，创作${count}个有故事感、能引发共鸣的短视频标题。

输出要求：
1. 返回一个JSON数组，包含${count}个标题字符串
2. 每个标题8-25个汉字
3. 标题要有故事感，像在讲自己的经历
4. 有情绪有温度有悬念，让人想点进去看

示例输出格式（主题：痛风）：
["得了痛风三年后我终于想通了","别再说痛风不能吃牛肉了真相在这","老公痛风发作那晚我慌了","痛风患者最该忌口的不是海鲜","我用这个方法让尿酸降了200"]

只输出JSON数组，不要任何其他内容。`;

  const prompt = `主题：${input.topic}`;

  // 使用新的 AI 客户端
  const client = createAIClient(config);
  const response = await client.generateText(prompt, systemPrompt, {
    temperature: 0.8,
  });

  // 尝试解析 JSON 格式
  let titles: string[] = [];
  try {
    // 尝试从响应中提取 JSON 数组
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      titles = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // JSON 解析失败，回退到按行分割
    console.log("[generateTitles] JSON 解析失败，使用换行分割");
  }

  // 如果 JSON 解析失败或结果为空，按换行符分割
  if (titles.length === 0) {
    titles = response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("{") && !line.startsWith("["))
      .slice(0, count);
  }

  return titles.slice(0, count).map((title) => ({
    content: title,
    metadata: { model: config.modelName },
  }));
}

/**
 * 生成文案
 */
export async function generateCopywriting(
  input: CopywritingGenerateInput,
  userId?: string,
  tenantId?: string
): Promise<TextGenerateResult[]> {
  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的文本生成 AI 配置");
  }

  const count = input.count || 5;
  const attrs = input.attributes || {};

  // 构建属性描述
  const attrDescriptions: string[] = [];
  if (attrs.perspective) attrDescriptions.push(`人称视角：${attrs.perspective}`);
  if (attrs.role) attrDescriptions.push(`角色设定：${attrs.role}`);
  if (attrs.gender) attrDescriptions.push(`性别：${attrs.gender}`);
  if (attrs.age) attrDescriptions.push(`年龄段：${attrs.age}`);
  if (attrs.purpose) attrDescriptions.push(`内容目的：${attrs.purpose}`);
  if (attrs.emotion) attrDescriptions.push(`情绪风格：${attrs.emotion}`);
  if (attrs.style) attrDescriptions.push(`表达风格：${attrs.style}`);
  if (attrs.duration) attrDescriptions.push(`目标时长：${attrs.duration}秒`);
  if (attrs.audience) attrDescriptions.push(`目标受众：${attrs.audience}`);

  const systemPrompt = `你是一个专业的短视频文案创作专家。请根据用户提供的主题和标题，生成${count}个不同版本的短视频文案。
要求：
- 文案要口语化，适合短视频配音
- 内容要有吸引力，能引起共鸣
- 每个版本用 "---" 分隔
- 只输出文案内容，不要编号或其他说明
${attrDescriptions.length > 0 ? `\n创作要求：\n${attrDescriptions.join("\n")}` : ""}`;

  const prompt = `主题：${input.topic}\n标题：${input.title}`;

  // 使用新的 AI 客户端
  const client = createAIClient(config);
  const response = await client.generateText(prompt, systemPrompt, {
    temperature: 0.8,
  });

  // 解析返回的文案
  const copies = response
    .split("---")
    .map((copy) => copy.trim())
    .filter((copy) => copy.length > 0)
    .slice(0, count);

  return copies.map((copy) => ({
    content: copy,
    metadata: { model: config.modelName },
  }));
}
