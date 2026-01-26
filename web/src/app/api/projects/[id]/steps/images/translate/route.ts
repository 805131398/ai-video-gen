import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translateText } from "@/lib/ai/translator";

/**
 * POST /api/projects/[id]/steps/images/translate
 * 翻译文本（支持英译中、中译英）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 解析请求参数
    const { id } = await params;
    const body = await request.json();
    const { text, direction } = body;

    // 参数验证
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "缺少必需参数: text" },
        { status: 400 }
      );
    }

    if (!direction || !["en-zh", "zh-en"].includes(direction)) {
      return NextResponse.json(
        { error: "无效的翻译方向，必须是 'en-zh' 或 'zh-en'" },
        { status: 400 }
      );
    }

    // 调用翻译服务
    const translation = await translateText(
      text,
      direction as "en-zh" | "zh-en",
      session.user.id,
      undefined
    );

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("翻译失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "翻译失败" },
      { status: 500 }
    );
  }
}
