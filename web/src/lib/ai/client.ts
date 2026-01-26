/**
 * AI 客户端适配器
 *
 * 统一处理不同 AI 提供商的 API 调用
 */

import {
  TextConfigOptions,
  mergeTextConfig,
} from "./types/index";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  model?: string;
  raw?: unknown;
}

/**
 * 从对象中按路径获取值
 * 支持 "a.b.c" 和 "a[0].b" 格式
 */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * AI 客户端类
 */
export class AIClient {
  private apiUrl: string;
  private apiKey: string;
  private modelName: string;
  private config: ReturnType<typeof mergeTextConfig>;

  constructor(
    apiUrl: string,
    apiKey: string,
    modelName: string,
    configOptions?: TextConfigOptions
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, ""); // 移除末尾斜杠
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.config = mergeTextConfig(configOptions);
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      [this.config.authHeader]: `${this.config.authPrefix}${this.apiKey}`,
    };

    if (this.config.extraHeaders) {
      Object.assign(headers, this.config.extraHeaders);
    }

    return headers;
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: ChatCompletionRequest): Record<string, unknown> {
    const { messages, temperature, maxTokens, topP, stream } = request;
    const body: Record<string, unknown> = {
      model: this.modelName,
    };

    // 处理消息
    if (this.config.separateSystemPrompt) {
      // Anthropic 风格：system 单独提取
      const systemMessage = messages.find((m) => m.role === "system");
      const otherMessages = messages.filter((m) => m.role !== "system");

      if (systemMessage) {
        body.system = systemMessage.content;
      }
      body.messages = otherMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    } else {
      // OpenAI 风格：所有消息在 messages 数组中
      body.messages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // 添加参数
    if (temperature !== undefined) {
      body.temperature = temperature;
    } else if (this.config.defaultParams?.temperature !== undefined) {
      body.temperature = this.config.defaultParams.temperature;
    }

    if (maxTokens !== undefined) {
      body.max_tokens = maxTokens;
    } else if (this.config.defaultParams?.maxTokens !== undefined) {
      body.max_tokens = this.config.defaultParams.maxTokens;
    }

    if (topP !== undefined) {
      body.top_p = topP;
    } else if (this.config.defaultParams?.topP !== undefined) {
      body.top_p = this.config.defaultParams.topP;
    }

    if (stream !== undefined) {
      body.stream = stream;
    }

    // 应用字段映射
    if (this.config.requestMapping) {
      for (const [from, to] of Object.entries(this.config.requestMapping)) {
        if (from in body && from !== to) {
          body[to] = body[from];
          delete body[from];
        }
      }
    }

    // 合并额外的默认参数
    if (this.config.defaultParams) {
      const { temperature: _t, maxTokens: _m, topP: _p, ...otherParams } = this.config.defaultParams;
      Object.assign(body, otherParams);
    }

    return body;
  }

  /**
   * 解析响应
   */
  private parseResponse(data: unknown): ChatCompletionResponse {
    const content = getByPath(data, this.config.responsePath) as string || "";

    // 尝试解析 usage 信息
    const usage = getByPath(data, "usage") as Record<string, number> | undefined;

    return {
      content,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens || usage.input_tokens,
            completionTokens: usage.completion_tokens || usage.output_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      model: getByPath(data, "model") as string | undefined,
      raw: data,
    };
  }

  /**
   * 发送聊天请求
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // 直接使用用户配置的完整 API URL，不再自动拼接 endpoint
    const url = this.apiUrl;
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request);

    console.log("[AIClient.chat] 发送请求:", {
      url,
      method: "POST",
      headers: { ...headers, Authorization: headers.Authorization?.substring(0, 20) + "..." },
      bodyPreview: {
        model: body.model,
        messagesCount: (body.messages as unknown[])?.length,
        temperature: body.temperature,
      },
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    console.log("[AIClient.chat] 收到响应:", {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      responsePreview: responseText.substring(0, 200),
    });

    if (!response.ok) {
      let errorMessage = `AI API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${responseText}`;
      }

      throw new Error(errorMessage);
    }

    // 检查响应是否为 HTML（API 配置错误时可能返回 HTML 页面）
    if (responseText.startsWith("<!") || responseText.startsWith("<html")) {
      throw new Error(
        `AI API 返回了 HTML 而非 JSON，请检查 API URL 配置是否正确。当前 URL: ${url}`
      );
    }

    try {
      const data = JSON.parse(responseText);
      return this.parseResponse(data);
    } catch (error) {
      console.error("[AIClient.chat] JSON 解析失败:", {
        error: error instanceof Error ? error.message : String(error),
        responseText: responseText.substring(0, 500),
        responseLength: responseText.length,
      });
      throw new Error(
        `AI API 返回格式错误，无法解析为 JSON。响应内容: ${responseText.substring(0, 200)}...`
      );
    }
  }

  /**
   * 简化的文本生成方法
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionRequest>
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    console.log("[AIClient.generateText] 发送的消息:", {
      systemPromptPreview: systemPrompt?.substring(0, 100) + "...",
      userPrompt: prompt,
      messagesCount: messages.length,
    });

    const response = await this.chat({
      messages,
      ...options,
    });

    return response.content;
  }
}

/**
 * 从数据库配置创建 AI 客户端
 */
export function createAIClient(config: {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: unknown;
}): AIClient {
  return new AIClient(
    config.apiUrl,
    config.apiKey,
    config.modelName,
    config.config as TextConfigOptions | undefined
  );
}
