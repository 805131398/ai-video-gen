import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTitles } from "@/lib/ai/text-generator";
import { withUsageLogging } from "@/lib/services/ai-usage-service";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@prisma/client";

// Token 估算辅助函数
function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

// POST /api/ai/titles - 生成标题
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, count, style, keywords, projectId } = body;

    if (!topic) {
      return NextResponse.json({ error: "主题不能为空" }, { status: 400 });
    }

    const config = await getEffectiveAIConfig(AIModelType.TEXT, session.user.id, session.user.tenantId);
    if (!config) {
      return NextResponse.json({ error: "未找到可用的 AI 配置" }, { status: 500 });
    }

    const titles = await withUsageLogging(
      {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        projectId: projectId,
        modelType: "TEXT",
        modelConfigId: config.id,
        taskId: `titles-${Date.now()}`,
      },
      async () => {
        const result = await generateTitles(
          { topic, count, style, keywords },
          session.user.id,
          session.user.tenantId
        );

        return {
          result,
          inputTokens: estimateTokenCount(topic + (keywords || []).join(" ")),
          outputTokens: result.reduce((sum, t) => sum + estimateTokenCount(t.title), 0),
          requestUrl: config.apiUrl,
          requestBody: { topic, count, style, keywords },
          responseBody: { titles: result },
        };
      }
    );

    return NextResponse.json({ data: titles });
  } catch (error) {
    console.error("生成标题失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
