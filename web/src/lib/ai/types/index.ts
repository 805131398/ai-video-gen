/**
 * AI 模型配置类型定义
 *
 * 支持多种模型类型和 API 格式的统一配置方案
 */

// ============ 通用类型 ============

/**
 * 预定义的 API 格式类型
 */
export type APIFormat =
  | "openai"      // OpenAI / Azure OpenAI / 大多数兼容 API
  | "anthropic"   // Claude API
  | "qwen"        // 通义千问
  | "zhipu"       // 智谱 AI
  | "baidu"       // 百度文心
  | "custom";     // 完全自定义

/**
 * 异步任务状态
 */
export type TaskStatus = "pending" | "processing" | "completed" | "failed";

/**
 * 基础配置选项（所有类型共用）
 */
export interface BaseConfigOptions {
  /** API 格式类型 */
  apiFormat?: APIFormat;
  /** API 端点路径 */
  endpoint?: string;
  /** 认证头名称 */
  authHeader?: string;
  /** 认证头值前缀 */
  authPrefix?: string;
  /** 额外请求头 */
  extraHeaders?: Record<string, string>;
  /** 请求体字段映射 */
  requestMapping?: Record<string, string>;
  /** 响应解析路径 */
  responsePath?: string;
}

// ============ TEXT 类型 ============

export interface TextConfigOptions extends BaseConfigOptions {
  /** 默认参数 */
  defaultParams?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    [key: string]: unknown;
  };
  /** 是否单独提取 system prompt (Anthropic 需要) */
  separateSystemPrompt?: boolean;
  /** 流式响应配置 */
  streaming?: {
    enabled?: boolean;
    deltaPath?: string;
  };
}

// ============ IMAGE 类型 ============

/**
 * 图片生成提供商
 */
export type ImageProvider =
  | "openai"           // DALL-E
  | "stability"        // Stable Diffusion
  | "midjourney"       // Midjourney (通过代理)
  | "qwen-image"       // 通义万相
  | "zhipu-image"      // 智谱 CogView
  | "baidu-image"      // 百度文心一格
  | "fal"              // fal.ai
  | "custom";

export interface ImageConfigOptions extends BaseConfigOptions {
  /** 图片提供商 */
  provider?: ImageProvider;
  /** 默认图片尺寸 */
  defaultSize?: string;  // "1024x1024", "512x512" 等
  /** 默认图片数量 */
  defaultN?: number;
  /** 默认质量 */
  defaultQuality?: "standard" | "hd";
  /** 默认风格 */
  defaultStyle?: "vivid" | "natural";
  /** 响应格式 */
  responseFormat?: "url" | "b64_json";
  /** 图片 URL 解析路径 */
  imageUrlPath?: string;
  /** 是否异步模式 */
  async?: boolean;
  /** 任务状态查询端点 */
  statusEndpoint?: string;
  /** 任务 ID 解析路径 */
  taskIdPath?: string;
  /** 任务状态解析路径 */
  taskStatusPath?: string;
}

// ============ VIDEO 类型 ============

/**
 * 视频生成提供商
 */
export type VideoProvider =
  | "sora"             // OpenAI Sora
  | "runway"           // Runway Gen-2/Gen-3
  | "pika"             // Pika Labs
  | "kling"            // 快手可灵
  | "minimax"          // MiniMax
  | "zhipu-video"      // 智谱 CogVideo
  | "fal-video"        // fal.ai 视频模型
  | "bltcy"            // bltcy 视频生成
  | "custom";

export interface VideoConfigOptions extends BaseConfigOptions {
  /** 视频提供商 */
  provider?: VideoProvider;
  /** 默认视频时长(秒) */
  defaultDuration?: number;
  /** 默认分辨率 */
  defaultResolution?: string;  // "1080p", "720p", "480p"
  /** 默认宽高比 */
  defaultAspectRatio?: string; // "16:9", "9:16", "1:1"
  /** 默认帧率 */
  defaultFps?: number;
  /** 任务提交端点 */
  submitEndpoint?: string;
  /** 任务状态查询端点 */
  statusEndpoint?: string;
  /** 任务 ID 解析路径 */
  taskIdPath?: string;
  /** 任务状态解析路径 */
  taskStatusPath?: string;
  /** 视频 URL 解析路径 */
  videoUrlPath?: string;
  /** 轮询间隔(毫秒) */
  pollInterval?: number;
  /** 最大等待时间(毫秒) */
  maxWaitTime?: number;
}

// ============ VOICE 类型 ============

/**
 * 语音生成提供商
 */
export type VoiceProvider =
  | "openai-tts"       // OpenAI TTS
  | "elevenlabs"       // ElevenLabs
  | "azure-tts"        // Azure TTS
  | "aliyun-tts"       // 阿里云 TTS
  | "tencent-tts"      // 腾讯云 TTS
  | "minimax-tts"      // MiniMax TTS
  | "custom";

export interface VoiceConfigOptions extends BaseConfigOptions {
  /** 语音提供商 */
  provider?: VoiceProvider;
  /** 默认音色/声音 ID */
  defaultVoice?: string;
  /** 默认语速 */
  defaultSpeed?: number;
  /** 默认音调 */
  defaultPitch?: number;
  /** 默认音量 */
  defaultVolume?: number;
  /** 输出格式 */
  outputFormat?: "mp3" | "wav" | "ogg" | "pcm";
  /** 采样率 */
  sampleRate?: number;
  /** 响应类型 */
  responseType?: "stream" | "base64" | "url";
  /** 音频数据解析路径 */
  audioDataPath?: string;
}

// ============ 统一配置类型 ============

/**
 * AI 模型配置选项（兼容旧版本）
 */
export type AIModelConfigOptions =
  | TextConfigOptions
  | ImageConfigOptions
  | VideoConfigOptions
  | VoiceConfigOptions;

// ============ 预定义格式默认值 ============

/**
 * TEXT 类型预定义格式默认值
 */
export const TEXT_FORMAT_DEFAULTS: Record<APIFormat, Partial<TextConfigOptions>> = {
  openai: {
    endpoint: "/chat/completions",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responsePath: "choices[0].message.content",
    separateSystemPrompt: false,
  },
  anthropic: {
    endpoint: "/v1/messages",
    authHeader: "x-api-key",
    authPrefix: "",
    extraHeaders: { "anthropic-version": "2023-06-01" },
    responsePath: "content[0].text",
    separateSystemPrompt: true,
  },
  qwen: {
    endpoint: "/compatible-mode/v1/chat/completions",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responsePath: "choices[0].message.content",
    separateSystemPrompt: false,
  },
  zhipu: {
    endpoint: "/api/paas/v4/chat/completions",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responsePath: "choices[0].message.content",
    separateSystemPrompt: false,
  },
  baidu: {
    endpoint: "/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responsePath: "result",
    separateSystemPrompt: false,
  },
  custom: {},
};

/**
 * IMAGE 类型预定义格式默认值
 */
export const IMAGE_FORMAT_DEFAULTS: Record<string, Partial<ImageConfigOptions>> = {
  openai: {
    provider: "openai",
    endpoint: "/v1/images/generations",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    imageUrlPath: "data[0].url",
    defaultSize: "1024x1024",
    defaultN: 1,
    responseFormat: "url",
  },
  stability: {
    provider: "stability",
    endpoint: "/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    imageUrlPath: "artifacts[0].base64",
    responseFormat: "b64_json",
  },
  "qwen-image": {
    provider: "qwen-image",
    endpoint: "/api/v1/services/aigc/text2image/image-synthesis",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    async: true,
    taskIdPath: "output.task_id",
    statusEndpoint: "/api/v1/tasks/{task_id}",
    taskStatusPath: "output.task_status",
    imageUrlPath: "output.results[0].url",
  },
  "zhipu-image": {
    provider: "zhipu-image",
    endpoint: "/api/paas/v4/images/generations",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    imageUrlPath: "data[0].url",
  },
  fal: {
    provider: "fal",
    endpoint: "/fal-ai/flux/dev",
    authHeader: "Authorization",
    authPrefix: "Key ",
    imageUrlPath: "images[0].url",
  },
};

/**
 * VIDEO 类型预定义格式默认值
 */
export const VIDEO_FORMAT_DEFAULTS: Record<string, Partial<VideoConfigOptions>> = {
  sora: {
    provider: "sora",
    submitEndpoint: "/v1/video/generations",
    statusEndpoint: "/v1/video/generations/{task_id}",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    taskIdPath: "id",
    taskStatusPath: "status",
    videoUrlPath: "video.url",
    pollInterval: 5000,
    maxWaitTime: 600000,
    defaultDuration: 5,
    defaultResolution: "1080p",
  },
  runway: {
    provider: "runway",
    submitEndpoint: "/v1/generations",
    statusEndpoint: "/v1/generations/{task_id}",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    taskIdPath: "id",
    taskStatusPath: "status",
    videoUrlPath: "output[0]",
    pollInterval: 3000,
    maxWaitTime: 300000,
  },
  kling: {
    provider: "kling",
    submitEndpoint: "/v1/videos/text2video",
    statusEndpoint: "/v1/videos/text2video/{task_id}",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    taskIdPath: "data.task_id",
    taskStatusPath: "data.task_status",
    videoUrlPath: "data.task_result.videos[0].url",
    pollInterval: 5000,
    maxWaitTime: 600000,
  },
  "zhipu-video": {
    provider: "zhipu-video",
    submitEndpoint: "/api/paas/v4/videos/generations",
    statusEndpoint: "/api/paas/v4/async-result/{task_id}",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    taskIdPath: "id",
    taskStatusPath: "task_status",
    videoUrlPath: "video_result[0].url",
    pollInterval: 5000,
    maxWaitTime: 600000,
  },
  "fal-video": {
    provider: "fal-video",
    submitEndpoint: "/fal-ai/sora-2/text-to-video",
    authHeader: "Authorization",
    authPrefix: "Key ",
    taskIdPath: "request_id",
    videoUrlPath: "video.url",
    pollInterval: 5000,
    maxWaitTime: 600000,
  },
  bltcy: {
    provider: "bltcy",
    submitEndpoint: "/v2/videos/generations",
    statusEndpoint: "/v2/videos/generations/{task_id}",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    taskIdPath: "id",
    taskStatusPath: "status",
    videoUrlPath: "video_url",
    pollInterval: 5000,
    maxWaitTime: 600000,
    defaultDuration: 10,
    defaultAspectRatio: "16:9",
  },
};

/**
 * VOICE 类型预定义格式默认值
 */
export const VOICE_FORMAT_DEFAULTS: Record<string, Partial<VoiceConfigOptions>> = {
  "openai-tts": {
    provider: "openai-tts",
    endpoint: "/v1/audio/speech",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responseType: "stream",
    outputFormat: "mp3",
    defaultVoice: "alloy",
    defaultSpeed: 1.0,
  },
  elevenlabs: {
    provider: "elevenlabs",
    endpoint: "/v1/text-to-speech/{voice_id}",
    authHeader: "xi-api-key",
    authPrefix: "",
    responseType: "stream",
    outputFormat: "mp3",
    defaultVoice: "21m00Tcm4TlvDq8ikWAM",
  },
  "azure-tts": {
    provider: "azure-tts",
    endpoint: "/cognitiveservices/v1",
    authHeader: "Ocp-Apim-Subscription-Key",
    authPrefix: "",
    responseType: "stream",
    outputFormat: "mp3",
  },
  "aliyun-tts": {
    provider: "aliyun-tts",
    endpoint: "/v1/services/aigc/text-to-speech/synthesis",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responseType: "url",
    audioDataPath: "output.audio_url",
    defaultVoice: "xiaoyun",
  },
  "minimax-tts": {
    provider: "minimax-tts",
    endpoint: "/v1/t2a_v2",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    responseType: "base64",
    audioDataPath: "data.audio",
    outputFormat: "mp3",
  },
};

// ============ 配置合并函数 ============

/**
 * 合并 TEXT 配置
 */
export function mergeTextConfig(
  userConfig?: TextConfigOptions
): Required<Pick<TextConfigOptions, 'endpoint' | 'authHeader' | 'authPrefix' | 'responsePath' | 'separateSystemPrompt'>> & TextConfigOptions {
  const format = userConfig?.apiFormat || "openai";
  const defaults = TEXT_FORMAT_DEFAULTS[format] || TEXT_FORMAT_DEFAULTS.openai;

  return {
    apiFormat: format,
    endpoint: userConfig?.endpoint || defaults.endpoint || "/chat/completions",
    authHeader: userConfig?.authHeader || defaults.authHeader || "Authorization",
    authPrefix: userConfig?.authPrefix ?? defaults.authPrefix ?? "Bearer ",
    extraHeaders: { ...defaults.extraHeaders, ...userConfig?.extraHeaders },
    requestMapping: { ...defaults.requestMapping, ...userConfig?.requestMapping },
    responsePath: userConfig?.responsePath || defaults.responsePath || "choices[0].message.content",
    defaultParams: { ...defaults.defaultParams, ...userConfig?.defaultParams },
    separateSystemPrompt: userConfig?.separateSystemPrompt ?? defaults.separateSystemPrompt ?? false,
    streaming: { ...defaults.streaming, ...userConfig?.streaming },
  };
}

/**
 * 合并 IMAGE 配置
 */
export function mergeImageConfig(
  userConfig?: ImageConfigOptions
): ImageConfigOptions {
  const provider = userConfig?.provider || "openai";
  const defaults = IMAGE_FORMAT_DEFAULTS[provider] || IMAGE_FORMAT_DEFAULTS.openai;

  return {
    ...defaults,
    ...userConfig,
    extraHeaders: { ...defaults.extraHeaders, ...userConfig?.extraHeaders },
  };
}

/**
 * 合并 VIDEO 配置
 */
export function mergeVideoConfig(
  userConfig?: VideoConfigOptions
): VideoConfigOptions {
  const provider = userConfig?.provider || "sora";
  const defaults = VIDEO_FORMAT_DEFAULTS[provider] || VIDEO_FORMAT_DEFAULTS.sora;

  return {
    ...defaults,
    ...userConfig,
    extraHeaders: { ...defaults.extraHeaders, ...userConfig?.extraHeaders },
  };
}

/**
 * 合并 VOICE 配置
 */
export function mergeVoiceConfig(
  userConfig?: VoiceConfigOptions
): VoiceConfigOptions {
  const provider = userConfig?.provider || "openai-tts";
  const defaults = VOICE_FORMAT_DEFAULTS[provider] || VOICE_FORMAT_DEFAULTS["openai-tts"];

  return {
    ...defaults,
    ...userConfig,
    extraHeaders: { ...defaults.extraHeaders, ...userConfig?.extraHeaders },
  };
}

// 兼容旧版本导出
export const API_FORMAT_DEFAULTS = TEXT_FORMAT_DEFAULTS;
export const mergeAIConfig = mergeTextConfig;
