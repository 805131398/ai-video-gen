/**
 * 视频生成服务 (MVP 模拟)
 */

export interface VideoGenerateInput {
  imageUrl: string;
  prompt?: string;
  duration?: number; // 秒
}

export interface VideoGenerateResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

// 模拟视频 URL 列表
const MOCK_VIDEOS = [
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_5mb.mp4",
];

/**
 * 生成视频 (模拟)
 */
export async function generateVideos(
  inputs: VideoGenerateInput[],
  count: number = 5
): Promise<VideoGenerateResult[]> {
  // 模拟 API 延迟
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));

  const results: VideoGenerateResult[] = [];

  for (let i = 0; i < count; i++) {
    const input = inputs[i % inputs.length];
    results.push({
      videoUrl: MOCK_VIDEOS[i % MOCK_VIDEOS.length],
      thumbnailUrl: input.imageUrl,
      duration: input.duration || 5,
      metadata: {
        width: 1080,
        height: 1920,
        format: "mp4",
      },
    });
  }

  return results;
}
