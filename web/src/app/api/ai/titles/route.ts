import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateTitles } from "@/lib/ai/text-generator";

// POST /api/ai/titles - 生成标题
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, count, style, keywords } = body;

    if (!topic) {
      return NextResponse.json({ error: "主题不能为空" }, { status: 400 });
    }

    const titles = await generateTitles(
      { topic, count, style, keywords },
      session.user.id,
      session.user.tenantId
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
