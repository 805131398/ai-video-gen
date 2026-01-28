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
    // 规范化 URL：移除多余的斜杠
    // 1. 移除协议后的多余斜杠 (https:// -> https://)
    let normalizedUrl = apiUrl.replace(/(:\/\/)\/+/g, "$1");
    // 2. 移除路径中的多余斜杠 (/path//to -> /path/to)
    normalizedUrl = normalizedUrl.replace(/([^:]\/)\/+/g, "$1");
    // 3. 移除末尾的所有斜杠
    normalizedUrl = normalizedUrl.replace(/\/+$/, "");

    this.apiUrl = normalizedUrl;
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.config = mergeVideoConfig(configOptions);

    console.log("[VideoClient] 初始化:", {
      originalApiUrl: apiUrl,
      normalizedApiUrl: this.apiUrl,
      provider: this.config.provider,
      submitEndpoint: this.config.submitEndpoint,
    });
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

      case "toapis":
        body.prompt = request.prompt;
        body.model = this.modelName;
        body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
        body.duration = request.duration || this.config.defaultDuration || 10;

        // 图生视频：如果提供了图片 URL，使用 image_urls 数组
        if (request.imageUrl) {
          body.image_urls = [request.imageUrl];
        }

        // metadata 参数
        const metadata: Record<string, unknown> = {};

        // n: 生成变体数量 (1-4)
        if (this.config.extraHeaders?.n !== undefined) {
          metadata.n = this.config.extraHeaders.n;
        }

        // watermark: 是否添加水印
        if (this.config.extraHeaders?.watermark !== undefined) {
          metadata.watermark = this.config.extraHeaders.watermark;
        }

        // hd: 是否生成高清视频
        if (this.config.extraHeaders?.hd !== undefined || this.config.defaultResolution === "1080p" || this.config.defaultResolution === "hd") {
          metadata.hd = this.config.extraHeaders?.hd ?? (this.config.defaultResolution === "1080p" || this.config.defaultResolution === "hd");
        }

        // private: 是否启用隐私模式
        if (this.config.extraHeaders?.private !== undefined) {
          metadata.private = this.config.extraHeaders.private;
        }

        // style: 视频风格
        if (request.style || this.config.extraHeaders?.style) {
          metadata.style = request.style || this.config.extraHeaders?.style;
        }

        // storyboard: 是否使用故事板功能
        if (this.config.extraHeaders?.storyboard !== undefined) {
          metadata.storyboard = this.config.extraHeaders.storyboard;
        }

        // character_url: 角色提取的参考视频 URL
        if (this.config.extraHeaders?.character_url) {
          metadata.character_url = this.config.extraHeaders.character_url;
        }

        // character_timestamps: 角色出现的时间戳
        if (this.config.extraHeaders?.character_timestamps) {
          metadata.character_timestamps = this.config.extraHeaders.character_timestamps;
        }

        // character_create: 自动创建角色
        if (this.config.extraHeaders?.character_create !== undefined) {
          metadata.character_create = this.config.extraHeaders.character_create;
        }

        // character_from_task: 从任务创建角色
        if (this.config.extraHeaders?.character_from_task) {
          metadata.character_from_task = this.config.extraHeaders.character_from_task;
        }

        // 只有在有 metadata 参数时才添加
        if (Object.keys(metadata).length > 0) {
          body.metadata = metadata;
        }

        // thumbnail: 是否生成缩略图
        if (this.config.extraHeaders?.thumbnail !== undefined) {
          body.thumbnail = this.config.extraHeaders.thumbnail;
        }
        break;

      case "wan2.6":
        body.prompt = request.prompt;
        body.model = this.modelName;
        body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
        body.resolution = request.resolution || this.config.defaultResolution || "720p";
        body.duration = request.duration || this.config.defaultDuration || 5;

        // 图生视频：如果提供了图片 URL，使用 image_urls 数组（仅支持1张图片）
        if (request.imageUrl) {
          body.image_urls = [request.imageUrl];
        }

        // negative_prompt: 负面提示词
        if (request.negativePrompt || this.config.extraHeaders?.negative_prompt) {
          body.negative_prompt = request.negativePrompt || this.config.extraHeaders?.negative_prompt;
        }

        // seed: 随机种子
        if (this.config.extraHeaders?.seed !== undefined) {
          body.seed = this.config.extraHeaders.seed;
        }

        // prompt_extend: 是否自动扩展提示词
        if (this.config.extraHeaders?.prompt_extend !== undefined) {
          body.prompt_extend = this.config.extraHeaders.prompt_extend;
        }

        // audio: 是否自动添加音频
        if (this.config.extraHeaders?.audio !== undefined) {
          body.audio = this.config.extraHeaders.audio;
        }

        // audio_url: 指定音频 URL
        if (this.config.extraHeaders?.audio_url) {
          body.audio_url = this.config.extraHeaders.audio_url;
        }

        // shot_type: 镜头类型
        if (this.config.extraHeaders?.shot_type) {
          body.shot_type = this.config.extraHeaders.shot_type;
        }

        // watermark: 是否添加水印
        if (this.config.extraHeaders?.watermark !== undefined) {
          body.watermark = this.config.extraHeaders.watermark;
        }

        // template: 特效模板（图生视频特效模式）
        if (this.config.extraHeaders?.template) {
          body.template = this.config.extraHeaders.template;
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
   *
   * 统一接口格式映射：
   * - NOT_START -> pending
   * - IN_PROGRESS -> processing
   * - SUCCESS -> completed
   * - FAILURE -> failed
   */
  private parseTaskStatus(rawStatus: string): TaskStatus {
    const status = rawStatus.toUpperCase();

    // 统一接口格式
    if (status === "NOT_START") return "pending";
    if (status === "IN_PROGRESS") return "processing";
    if (status === "SUCCESS") return "completed";
    if (status === "FAILURE") return "failed";

    // 兼容其他常见格式（转为小写匹配）
    const lowerStatus = rawStatus.toLowerCase();
    if (["pending", "queued", "submitted"].includes(lowerStatus)) return "pending";
    if (["processing", "running", "in_progress"].includes(lowerStatus)) return "processing";
    if (["completed", "succeeded", "success", "done"].includes(lowerStatus)) return "completed";
    if (["failed", "failure", "error", "cancelled"].includes(lowerStatus)) return "failed";

    // 默认返回 processing（避免误判为完成）
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

    // 提取错误消息：支持多种格式
    let message = getByPath(data, "message") as string | undefined;
    if (status === "failed") {
      // 优先级：error.message > fail_reason > message
      const errorMessage = getByPath(data, "error.message") as string | undefined;
      const failReason = getByPath(data, "fail_reason") as string | undefined;
      message = errorMessage || failReason || message || "任务执行失败";
    }

    // 提取缩略图 URL：支持多种路径
    let thumbnailUrl = getByPath(data, "thumbnail_url") as string | undefined;
    if (!thumbnailUrl && status === "completed") {
      // 尝试从 result.data[0].thumbnail_url 获取（toapis 格式）
      thumbnailUrl = getByPath(data, "result.data[0].thumbnail_url") as string | undefined;
    }

    return {
      taskId,
      status,
      progress: getByPath(data, "progress") as number | undefined,
      videoUrl: status === "completed" ? getByPath(data, videoUrlPath) as string : undefined,
      thumbnailUrl,
      duration: getByPath(data, "duration") as number | undefined,
      message,
      raw: data,
    };
  }

  /**
   * 构建完整的 URL
   */
  private buildUrl(endpoint: string): string {
    // 移除 apiUrl 末尾的所有斜杠
    let baseUrl = this.apiUrl.replace(/\/+$/, "");

    // 确保 endpoint 以单个斜杠开头
    const normalizedEndpoint = endpoint.replace(/^\/+/, "/");

    // 检查 baseUrl 是否已经包含了 endpoint 的开头部分
    // 例如：baseUrl = "https://api.bltcy.ai/v2/videos/generations"
    //      endpoint = "/v2/videos/generations/task_id"
    // 需要移除 baseUrl 中重复的部分
    const endpointParts = normalizedEndpoint.split("/").filter(Boolean);

    // 找到重复的部分
    let overlapIndex = -1;
    for (let i = 0; i < endpointParts.length; i++) {
      const endpointSubPath = "/" + endpointParts.slice(0, i + 1).join("/");
      if (baseUrl.endsWith(endpointSubPath)) {
        overlapIndex = i;
      }
    }

    // 如果找到重复部分，移除 endpoint 中重复的部分
    let finalEndpoint = normalizedEndpoint;
    if (overlapIndex >= 0) {
      const remainingParts = endpointParts.slice(overlapIndex + 1);
      finalEndpoint = remainingParts.length > 0 ? "/" + remainingParts.join("/") : "";

      console.log("[VideoClient.buildUrl] 检测到重复路径:", {
        baseUrl,
        originalEndpoint: normalizedEndpoint,
        overlapIndex,
        finalEndpoint,
      });
    }

    // 如果 finalEndpoint 为空，直接返回 baseUrl
    if (!finalEndpoint) {
      return baseUrl;
    }

    // 拼接 URL
    const finalUrl = `${baseUrl}${finalEndpoint}`;
    console.log("[VideoClient.buildUrl] 构建 URL:", {
      baseUrl,
      endpoint: finalEndpoint,
      result: finalUrl,
    });
    return finalUrl;
  }

  /**
   * 提交视频生成任务
   */
  async submit(request: VideoGenerateRequest): Promise<VideoTaskResult> {
    const endpoint = this.config.submitEndpoint || this.config.endpoint || "/v1/video/generations";
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request);

    console.log("[VideoClient.submit] 提交任务:", {
      url,
      provider: this.config.provider,
      model: this.modelName,
      body,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const responseText = await response.text();

    console.log("[VideoClient.submit] 响应:", {
      status: response.status,
      ok: response.ok,
      responsePreview: responseText.substring(0, 200),
    });

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
    const url = this.buildUrl(statusEndpoint);
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
