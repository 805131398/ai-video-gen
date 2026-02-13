import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateVoice, AVAILABLE_VOICES } from "@/lib/ai/voice-generator";
import { withUsageLogging } from "@/lib/services/ai-usage-service";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@prisma/client";

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
    const { text, voiceId, speed, pitch, projectId } = body;

    if (!text) {
      return NextResponse.json({ error: "文本不能为空" }, { status: 400 });
    }

    const config = await getEffectiveAIConfig(AIModelType.VOICE, session.user.id, session.user.tenantId);
    if (!config) {
      return NextResponse.json({ error: "未找到可用的 AI 配置" }, { status: 500 });
    }

    const voice = await withUsageLogging(
      {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        projectId: projectId,
        modelType: "VOICE",
        modelConfigId: config.id,
        taskId: `voice-${Date.now()}`,
      },
      async () => {
        const result = await generateVoice({ text, voiceId, speed, pitch });

        return {
          result,
          inputTokens: text.length, // 字符数
          outputTokens: 1, // 音频文件数
          requestUrl: config.apiUrl,
          requestBody: { text, voiceId, speed, pitch },
          responseBody: { audioUrl: result.audioUrl },
        };
      }
    );

    return NextResponse.json({ data: voice });
  } catch (error) {
    console.error("生成配音失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
