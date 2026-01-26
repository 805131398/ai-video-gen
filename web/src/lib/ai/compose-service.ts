/**
 * 视频合成服务 (MVP 模拟)
 */

export interface ComposeInput {
  videoUrls: string[];
  audioUrl?: string;
  transitions?: {
    type: "fade" | "slide" | "none";
    duration: number; // 毫秒
  };
  outputFormat?: "mp4" | "webm";
}

export interface ComposeResult {
  videoUrl: string;
  duration: number;
  fileSize: number;
  metadata: {
    width: number;
    height: number;
    format: string;
    fps: number;
    hasAudio: boolean;
  };
}

// 模拟合成后的视频 URL
const MOCK_COMPOSED_VIDEO = "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_10mb.mp4";

/**
 * 合成最终视频 (模拟)
 */
export async function composeVideo(input: ComposeInput): Promise<ComposeResult> {
  // 模拟较长的处理时间
  await new Promise((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));

  // 估算总时长
  const estimatedDuration = input.videoUrls.length * 5; // 假设每个片段 5 秒

  return {
    videoUrl: MOCK_COMPOSED_VIDEO,
    duration: estimatedDuration,
    fileSize: estimatedDuration * 500000, // 约 500KB/秒
    metadata: {
      width: 1080,
      height: 1920,
      format: input.outputFormat || "mp4",
      fps: 30,
      hasAudio: !!input.audioUrl,
    },
  };
}
