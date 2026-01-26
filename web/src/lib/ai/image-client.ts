/**
 * 图片生成客户端适配器
 *
 * 支持 DALL-E, Stable Diffusion, 通义万相等多种图片生成 API
 */

import { ImageConfigOptions, mergeImageConfig } from "./types/index";

export interface ImageGenerateRequest {
  prompt: string;
  negativePrompt?: string;
  size?: string;
  n?: number;
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  responseFormat?: "url" | "b64_json";
}

export interface ImageGenerateResponse {
  images: Array<{
    url?: string;
    base64?: string;
    revisedPrompt?: string;
  }>;
  taskId?: string;
  status?: string;
  raw?: unknown;
}

/**
 * 从对象中按路径获取值
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
 * 图片生成客户端
 */
export class ImageClient {
  private apiUrl: string;
  private apiKey: string;
  private modelName: string;
  private config: ImageConfigOptions;

  constructor(
    apiUrl: string,
    apiKey: string,
    modelName: string,
    configOptions?: ImageConfigOptions
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.config = mergeImageConfig(configOptions);
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const authHeader = this.config.authHeader || "Authorization";
    const authPrefix = this.config.authPrefix ?? "Bearer ";
    headers[authHeader] = `${authPrefix}${this.apiKey}`;

    if (this.config.extraHeaders) {
      Object.assign(headers, this.config.extraHeaders);
    }

    return headers;
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: ImageGenerateRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.modelName,
      prompt: request.prompt,
    };

    // 根据提供商构建不同的请求体
    switch (this.config.provider) {
      case "openai":
        body.size = request.size || this.config.defaultSize || "1024x1024";
        body.n = request.n || this.config.defaultN || 1;
        body.quality = request.quality || this.config.defaultQuality || "standard";
        body.style = request.style || this.config.defaultStyle;
        body.response_format = request.responseFormat || this.config.responseFormat || "url";
        break;

      case "stability":
        body.text_prompts = [{ text: request.prompt, weight: 1 }];
        if (request.negativePrompt) {
          (body.text_prompts as Array<{text: string; weight: number}>).push({
            text: request.negativePrompt,
            weight: -1,
          });
        }
        body.samples = request.n || this.config.defaultN || 1;
        delete body.prompt;
        break;

      case "qwen-image":
        body.input = { prompt: request.prompt };
        body.parameters = {
          size: request.size || this.config.defaultSize,
          n: request.n || this.config.defaultN || 1,
        };
        delete body.prompt;
        break;

      case "fal":
        body.prompt = request.prompt;
        body.image_size = request.size || this.config.defaultSize || "landscape_16_9";
        body.num_images = request.n || this.config.defaultN || 1;
        break;

      default:
        // 通用格式
        if (request.size) body.size = request.size;
        if (request.n) body.n = request.n;
        if (request.negativePrompt) body.negative_prompt = request.negativePrompt;
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

    return body;
  }

  /**
   * 解析响应
   */
  private parseResponse(data: unknown): ImageGenerateResponse {
    const imagePath = this.config.imageUrlPath || "data[0].url";
    const responseFormat = this.config.responseFormat || "url";

    // 尝试解析图片数组
    let images: ImageGenerateResponse["images"] = [];

    if (this.config.provider === "stability") {
      // Stability AI 返回 base64
      const artifacts = getByPath(data, "artifacts") as Array<{ base64: string }> | undefined;
      if (artifacts) {
        images = artifacts.map((a) => ({ base64: a.base64 }));
      }
    } else if (this.config.provider === "fal") {
      // fal.ai 格式
      const falImages = getByPath(data, "images") as Array<{ url: string }> | undefined;
      if (falImages) {
        images = falImages.map((img) => ({ url: img.url }));
      }
    } else {
      // OpenAI 兼容格式
      const dataArray = getByPath(data, "data") as Array<{ url?: string; b64_json?: string; revised_prompt?: string }> | undefined;
      if (dataArray) {
        images = dataArray.map((item) => ({
          url: item.url,
          base64: item.b64_json,
          revisedPrompt: item.revised_prompt,
        }));
      } else {
        // 单个图片
        const url = getByPath(data, imagePath) as string | undefined;
        if (url) {
          images = [responseFormat === "url" ? { url } : { base64: url }];
        }
      }
    }

    return {
      images,
      taskId: getByPath(data, this.config.taskIdPath || "task_id") as string | undefined,
      status: getByPath(data, this.config.taskStatusPath || "status") as string | undefined,
      raw: data,
    };
  }

  /**
   * 生成图片
   */
  async generate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    const endpoint = this.config.endpoint || "/v1/images/generations";
    const url = `${this.apiUrl}${endpoint}`;
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request);

    console.log("[ImageClient.generate] 发送请求:", {
      url,
      provider: this.config.provider,
      model: this.modelName,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Image API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${responseText}`;
      }
      throw new Error(errorMessage);
    }

    const data = JSON.parse(responseText);

    // 如果是异步模式，需要轮询
    if (this.config.async) {
      return this.pollForResult(data);
    }

    return this.parseResponse(data);
  }

  /**
   * 轮询异步任务结果
   */
  private async pollForResult(initialData: unknown): Promise<ImageGenerateResponse> {
    const taskId = getByPath(initialData, this.config.taskIdPath || "task_id") as string;
    if (!taskId) {
      throw new Error("未获取到任务 ID");
    }

    const statusEndpoint = (this.config.statusEndpoint || "/tasks/{task_id}").replace("{task_id}", taskId);
    const url = `${this.apiUrl}${statusEndpoint}`;
    const headers = this.buildHeaders();
    const pollInterval = 3000;
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const response = await fetch(url, { headers });
      const data = JSON.parse(await response.text());

      const status = getByPath(data, this.config.taskStatusPath || "status") as string;
      console.log(`[ImageClient] 任务状态: ${status} (${i + 1}/${maxAttempts})`);

      if (status === "SUCCEEDED" || status === "completed" || status === "success") {
        return this.parseResponse(data);
      }

      if (status === "FAILED" || status === "failed" || status === "error") {
        throw new Error("图片生成任务失败");
      }
    }

    throw new Error("图片生成超时");
  }
}

/**
 * 创建图片生成客户端
 */
export function createImageClient(config: {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: unknown;
}): ImageClient {
  return new ImageClient(
    config.apiUrl,
    config.apiKey,
    config.modelName,
    config.config as ImageConfigOptions | undefined
  );
}
