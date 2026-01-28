import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { generateVideos } from "@/lib/ai/video-generator";

// POST /api/ai/videos - 生成视频 (MVP 模拟)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { images, count } = body;

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "图片不能为空" }, { status: 400 });
    }

    const inputs = images.map((img: { url: string; prompt?: string; duration?: number }) => ({
      imageUrl: img.url,
      prompt: img.prompt,
      duration: img.duration,
    }));

    const videos = await generateVideos(inputs, count || 5);

    return NextResponse.json({ data: videos });
  } catch (error) {
    console.error("生成视频失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
