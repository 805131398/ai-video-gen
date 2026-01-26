/**
 * 配音生成服务 (MVP 模拟)
 */

export interface VoiceGenerateInput {
  text: string;
  voiceId?: string;
  speed?: number; // 0.5 - 2.0
  pitch?: number; // 0.5 - 2.0
}

export interface VoiceGenerateResult {
  audioUrl: string;
  duration: number; // 秒
  metadata: {
    voiceId: string;
    voiceName: string;
    format: string;
    sampleRate: number;
  };
}

// 模拟音频 URL
const MOCK_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

// 可用的配音角色
export const AVAILABLE_VOICES = [
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", gender: "female", language: "zh-CN" },
  { id: "zh-CN-YunxiNeural", name: "云希", gender: "male", language: "zh-CN" },
  { id: "zh-CN-YunjianNeural", name: "云健", gender: "male", language: "zh-CN" },
  { id: "zh-CN-XiaoyiNeural", name: "晓伊", gender: "female", language: "zh-CN" },
  { id: "zh-CN-YunyangNeural", name: "云扬", gender: "male", language: "zh-CN" },
];

/**
 * 生成配音 (模拟)
 */
export async function generateVoice(
  input: VoiceGenerateInput
): Promise<VoiceGenerateResult> {
  // 模拟 API 延迟
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 500));

  // 估算时长：中文约 4 字/秒
  const estimatedDuration = Math.ceil(input.text.length / 4);
  const voice = AVAILABLE_VOICES.find((v) => v.id === input.voiceId) || AVAILABLE_VOICES[0];

  return {
    audioUrl: MOCK_AUDIO_URL,
    duration: estimatedDuration,
    metadata: {
      voiceId: voice.id,
      voiceName: voice.name,
      format: "mp3",
      sampleRate: 24000,
    },
  };
}
