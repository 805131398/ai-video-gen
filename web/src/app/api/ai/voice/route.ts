import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateVoice, AVAILABLE_VOICES } from "@/lib/ai/voice-generator";

// GET /api/ai/voice - 获取可用配音角色
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    return NextResponse.json({ data: AVAILABLE_VOICES });
  } catch (error) {
    console.error("获取配音角色失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/ai/voice - 生成配音 (MVP 模拟)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { text, voiceId, speed, pitch } = body;

    if (!text) {
      return NextResponse.json({ error: "文本不能为空" }, { status: 400 });
    }

    const voice = await generateVoice({ text, voiceId, speed, pitch });

    return NextResponse.json({ data: voice });
  } catch (error) {
    console.error("生成配音失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
