/**
 * 语音生成客户端适配器
 *
 * 支持 OpenAI TTS, ElevenLabs, Azure TTS 等多种语音合成 API
 */

import { VoiceConfigOptions, mergeVoiceConfig } from "./types/index";

export interface VoiceGenerateRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: "mp3" | "wav" | "ogg" | "pcm";
  sampleRate?: number;
}

export interface VoiceGenerateResponse {
  audioData?: ArrayBuffer;
  audioBase64?: string;
  audioUrl?: string;
  duration?: number;
  format?: string;
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
 * 语音生成客户端
 */
export class VoiceClient {
  private apiUrl: string;
  private apiKey: string;
  private modelName: string;
  private config: VoiceConfigOptions;

  constructor(
    apiUrl: string,
    apiKey: string,
    modelName: string,
    configOptions?: VoiceConfigOptions
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.config = mergeVoiceConfig(configOptions);
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
  private buildRequestBody(request: VoiceGenerateRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    // 根据提供商构建不同的请求体
    switch (this.config.provider) {
      case "openai-tts":
        body.model = this.modelName;
        body.input = request.text;
        body.voice = request.voice || this.config.defaultVoice || "alloy";
        body.speed = request.speed || this.config.defaultSpeed || 1.0;
        body.response_format = request.format || this.config.outputFormat || "mp3";
        break;

      case "elevenlabs":
        body.text = request.text;
        body.model_id = this.modelName;
        body.voice_settings = {
          stability: 0.5,
          similarity_boost: 0.75,
        };
        break;

      case "azure-tts":
        // Azure TTS 使用 SSML 格式
        const voice = request.voice || this.config.defaultVoice || "zh-CN-XiaoxiaoNeural";
        const rate = request.speed ? `${(request.speed - 1) * 100}%` : "0%";
        const pitch = request.pitch ? `${(request.pitch - 1) * 50}%` : "0%";
        body.ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
          <voice name="${voice}">
            <prosody rate="${rate}" pitch="${pitch}">${request.text}</prosody>
          </voice>
        </speak>`;
        break;

      case "aliyun-tts":
        body.model = this.modelName;
        body.input = { text: request.text };
        body.parameters = {
          voice: request.voice || this.config.defaultVoice || "xiaoyun",
          format: request.format || this.config.outputFormat || "mp3",
          sample_rate: request.sampleRate || this.config.sampleRate || 16000,
          speech_rate: request.speed ? Math.round((request.speed - 1) * 500) : 0,
          pitch_rate: request.pitch ? Math.round((request.pitch - 1) * 500) : 0,
        };
        break;

      case "minimax-tts":
        body.model = this.modelName;
        body.text = request.text;
        body.voice_id = request.voice || this.config.defaultVoice;
        body.speed = request.speed || this.config.defaultSpeed || 1.0;
        body.vol = request.volume || this.config.defaultVolume || 1.0;
        body.pitch = request.pitch || this.config.defaultPitch || 0;
        body.audio_sample_rate = request.sampleRate || this.config.sampleRate || 24000;
        body.bitrate = 128000;
        break;

      default:
        // 通用格式
        body.model = this.modelName;
        body.text = request.text;
        body.voice = request.voice || this.config.defaultVoice;
        if (request.speed) body.speed = request.speed;
        if (request.pitch) body.pitch = request.pitch;
        if (request.format) body.format = request.format;
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
   * 获取端点 URL
   */
  private getEndpointUrl(request: VoiceGenerateRequest): string {
    let endpoint = this.config.endpoint || "/v1/audio/speech";

    // ElevenLabs 需要在 URL 中包含 voice_id
    if (this.config.provider === "elevenlabs") {
      const voiceId = request.voice || this.config.defaultVoice || "21m00Tcm4TlvDq8ikWAM";
      endpoint = endpoint.replace("{voice_id}", voiceId);
    }

    return `${this.apiUrl}${endpoint}`;
  }

  /**
   * 生成语音
   */
  async generate(request: VoiceGenerateRequest): Promise<VoiceGenerateResponse> {
    const url = this.getEndpointUrl(request);
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(request);

    // Azure TTS 需要特殊的 Content-Type
    if (this.config.provider === "azure-tts") {
      headers["Content-Type"] = "application/ssml+xml";
      headers["X-Microsoft-OutputFormat"] = "audio-16khz-128kbitrate-mono-mp3";
    }

    console.log("[VoiceClient.generate] 发送请求:", {
      url,
      provider: this.config.provider,
      model: this.modelName,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: this.config.provider === "azure-tts" ? (body.ssml as string) : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Voice API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    // 根据响应类型处理
    const responseType = this.config.responseType || "stream";

    if (responseType === "stream") {
      // 直接返回音频流
      const audioData = await response.arrayBuffer();
      return {
        audioData,
        format: this.config.outputFormat || "mp3",
      };
    }

    // JSON 响应
    const data = await response.json();

    if (responseType === "base64") {
      const audioDataPath = this.config.audioDataPath || "audio";
      const audioBase64 = getByPath(data, audioDataPath) as string;
      return {
        audioBase64,
        format: this.config.outputFormat || "mp3",
        raw: data,
      };
    }

    if (responseType === "url") {
      const audioDataPath = this.config.audioDataPath || "audio_url";
      const audioUrl = getByPath(data, audioDataPath) as string;
      return {
        audioUrl,
        format: this.config.outputFormat || "mp3",
        raw: data,
      };
    }

    return { raw: data };
  }

  /**
   * 生成语音并返回 base64
   */
  async generateBase64(request: VoiceGenerateRequest): Promise<string> {
    const result = await this.generate(request);

    if (result.audioBase64) {
      return result.audioBase64;
    }

    if (result.audioData) {
      // 将 ArrayBuffer 转换为 base64
      const bytes = new Uint8Array(result.audioData);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    if (result.audioUrl) {
      // 从 URL 下载并转换
      const response = await fetch(result.audioUrl);
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    throw new Error("无法获取音频数据");
  }
}

/**
 * 创建语音生成客户端
 */
export function createVoiceClient(config: {
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: unknown;
}): VoiceClient {
  return new VoiceClient(
    config.apiUrl,
    config.apiKey,
    config.modelName,
    config.config as VoiceConfigOptions | undefined
  );
}
