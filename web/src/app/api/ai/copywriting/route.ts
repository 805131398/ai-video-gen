import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCopywriting } from "@/lib/ai/text-generator";
import { withUsageLogging } from "@/lib/services/ai-usage-service";
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@prisma/client";

// Token 估算辅助函数
function estimateTokenCount(text: string): number {
  // 粗略估算：中文 ~1.5 字符/token，英文 ~4 字符/token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

// POST /api/ai/copywriting - 生成文案
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, title, count, attributes, projectId } = body;

    if (!topic || !title) {
      return NextResponse.json({ error: "主题和标题不能为空" }, { status: 400 });
    }

    const config = await getEffectiveAIConfig(AIModelType.TEXT, session.user.id, session.user.tenantId);
    if (!config) {
      return NextResponse.json({ error: "未找到可用的 AI 配置" }, { status: 500 });
    }

    const copies = await withUsageLogging(
      {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        projectId: projectId,
        modelType: "TEXT",
        modelConfigId: config.id,
        taskId: `copywriting-${Date.now()}`,
      },
      async () => {
        const result = await generateCopywriting(
          { topic, title, count, attributes },
          session.user.id,
          session.user.tenantId
        );

        return {
          result,
          inputTokens: estimateTokenCount(title + JSON.stringify(attributes || {})),
          outputTokens: result.reduce((sum, c) => sum + estimateTokenCount(c.content), 0),
          requestUrl: config.apiUrl,
          requestBody: { title, attributes, count },
          responseBody: { copywritings: result },
        };
      }
    );

    return NextResponse.json({ data: copies });
  } catch (error) {
    console.error("生成文案失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
