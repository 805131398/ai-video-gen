import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { composeVideo } from "@/lib/ai/compose-service";

// POST /api/ai/compose - 合成最终视频 (MVP 模拟)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { videoUrls, audioUrl, transitions, outputFormat } = body;

    if (!videoUrls || videoUrls.length === 0) {
      return NextResponse.json({ error: "视频列表不能为空" }, { status: 400 });
    }

    const result = await composeVideo({
      videoUrls,
      audioUrl,
      transitions,
      outputFormat,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("合成视频失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "合成失败" },
      { status: 500 }
    );
  }
}
