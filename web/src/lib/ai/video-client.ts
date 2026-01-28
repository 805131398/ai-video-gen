/**
 * 视频生成客户端适配器
 *
 * 支持 Sora, Runway, 可灵等多种视频生成 API
 * 所有视频生成都是异步任务模式
 */

import { VideoConfigOptions, mergeVideoConfig, TaskStatus } from "./types/index";

export interface VideoGenerateRequest {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  fps?: number;
  imageUrl?: string;  // 图生视频的输入图片
  style?: string;
}

export interface VideoTaskResult {
  taskId: string;
  status: TaskStatus;
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  message?: string;
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
 * 视频生成客户端
 */
export class VideoClient {
  private apiUrl: string;
  private apiKey: string;
  private modelName: string;
  private config: VideoConfigOptions;

  constructor(
    apiUrl: string,
    apiKey: string,
    modelName: string,
    configOptions?: VideoConfigOptions
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.config = mergeVideoConfig(configOptions);
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
  private buildRequestBody(request: VideoGenerateRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.modelName,
      prompt: request.prompt,
    };

    // 根据提供商构建不同的请求体
    switch (this.config.provider) {
      case "sora":
        body.duration = request.duration || this.config.defaultDuration || 5;
        body.resolution = request.resolution || this.config.defaultResolution || "1080p";
        body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
        if (request.imageUrl) body.image_url = request.imageUrl;
        break;

      case "runway":
        body.promptText = request.prompt;
        body.seconds = request.duration || this.config.defaultDuration || 4;
        if (request.imageUrl) body.init_image = request.imageUrl;
        delete body.prompt;
        break;

      case "kling":
        body.prompt = request.prompt;
        body.duration = String(request.duration || this.config.defaultDuration || 5);
        body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
        if (request.negativePrompt) body.negative_prompt = request.negativePrompt;
        if (request.imageUrl) body.image_url = request.imageUrl;
        break;

      case "zhipu-video":
        body.prompt = request.prompt;
        body.duration = request.duration || this.config.defaultDuration || 5;
        if (request.imageUrl) body.image_url = request.imageUrl;
        break;

      case "fal-video":
        body.prompt = request.prompt;
        body.duration = request.duration || this.config.defaultDuration || 5;
        body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
        if (request.imageUrl) body.image_url = request.imageUrl;
        break;

      case "minimax":
        body.prompt = request.prompt;
        if (request.imageUrl) body.first_frame_image = request.imageUrl;
        break;

      case "bltcy":
        body.prompt = request.prompt;
        body.model = this.modelName;
        body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
        body.hd = this.config.defaultResolution === "1080p" || this.config.defaultResolution === "hd";
        body.duration = String(request.duration || this.config.defaultDuration || 10);

        // 图生视频：如果提供了图片 URL，使用 images 数组
        if (request.imageUrl) {
          body.images = [request.imageUrl];
        }

        // 可选参数
        if (this.config.extraHeaders?.watermark !== undefined) {
          body.watermark = this.config.extraHeaders.watermark;
        }
        if (this.config.extraHeaders?.private !== undefined) {
          body.private = this.config.extraHeaders.private;
        }
        if (this.config.extraHeaders?.notify_hook) {
          body.notify_hook = this.config.extraHeaders.notify_hook;
        }
        break;

      default:
        // 通用格式
        if (request.duration) body.duration = request.duration;
        if (request.resolution) body.resolution = request.resolution;
        if (request.aspectRatio) body.aspect_ratio = request.aspectRatio;
        if (request.fps) body.fps = request.fps;
        if (request.negativePrompt) body.negative_prompt = request.negativePrompt;
        if (request.imageUrl) body.image_url = request.imageUrl;
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
   * 解析任务状态
   */
  private parseTaskStatus(rawStatus: string): TaskStatus {
    const status = rawStatus.toLowerCase();
    if (["pending", "queued", "submitted"].includes(status)) return "pending";
    if (["processing", "running", "in_progress"].includes(status)) return "processing";
    if (["completed", "succeeded", "success", "done"].includes(status)) return "completed";
    if (["failed", "error", "cancelled"].includes(status)) return "failed";
    return "processing";
  }

  /**
   * 解析任务结果
   */
  private parseTaskResult(data: unknown, taskId: string): VideoTaskResult {
    const statusPath = this.config.taskStatusPath || "status";
    const videoUrlPath = this.config.videoUrlPath || "video.url";

    const rawStatus = getByPath(data, statusPath) as string || "processing";
    const status = this.parseTaskStatus(rawStatus);

    return {
      taskId,
      status,
      progress: getByPath(data, "progress") as number | undefined,
      videoUrl: status === "completed" ? getByPath(data, videoUrlPath) as string : undefined,
      thumbnailUrl: getByPath(data, "thumbnail_url") as string | undefined,
      duration: getByPath(data, "duration") as number | undefined,
      message: getByPath(data, "message") as string | undefined,
      raw: data,
    };
  }

  /**
   * 提交视频生成任务
   */
  async submit(request: VideoGenerateRequest): Promise<VideoTaskResult> {
    const endpoint = this.config.submitEndpoint || this.config.endpoint || "/v1/video/generations";
    const url = `${this.apiUrl}${endpoint}`;
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request);

    console.log("[VideoClient.submit] 提交任务:", {
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
      let errorMessage = `Video API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${responseText}`;
      }
      throw new Error(errorMessage);
    }

    const data = JSON.parse(responseText);
    const taskIdPath = this.config.taskIdPath || "id";
    const taskId = getByPath(data, taskIdPath) as string;

    if (!taskId) {
      throw new Error("未获取到任务 ID");
    }

    return this.parseTaskResult(data, taskId);
  }

  /**
   * 查询任务状态
   */
  async getStatus(taskId: string): Promise<VideoTaskResult> {
    const statusEndpoint = (this.config.statusEndpoint || "/v1/video/generations/{task_id}")
      .replace("{task_id}", taskId);
    const url = `${this.apiUrl}${statusEndpoint}`;
    const headers = this.buildHeaders();

    const response = await fetch(url, { headers });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`查询任务状态失败: ${response.status}`);
    }

    const data = JSON.parse(responseText);
    return this.parseTaskResult(data, taskId);
  }

  /**
   * 等待任务完成（轮询模式）
   */
  async waitForCompletion(
    taskId: string,
    onProgress?: (result: VideoTaskResult) => void
  ): Promise<VideoTaskResult> {
    const pollInterval = this.config.pollInterval || 5000;
    const maxWaitTime = this.config.maxWaitTime || 600000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getStatus(taskId);

      if (onProgress) {
        onProgress(result);
      }

      console.log(`[VideoClient] 任务 ${taskId} 状态: ${result.status}`);

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "failed") {
        throw new Error(result.message || "视频生成失败");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("视频生成超时");
  }

  /**
   * 生成视频（提交并等待完成）
   */
  async generate(
    request: VideoGenerateRequest,
    onProgress?: (result: VideoTaskResult) => void
  ): Promise<VideoTaskResult> {
    const submitResult = await this.submit(request);

    if (onProgress) {
      onProgress(submitResult);
    }

    return this.waitForCompletion(submitResult.taskId, onProgress);
  }
}

/**
 * 创建视频生成客户端
 */
export function createVideoClient(config: {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: unknown;
}): VideoClient {
  return new VideoClient(
    config.apiUrl,
    config.apiKey,
    config.modelName,
    config.config as VideoConfigOptions | undefined
  );
}
