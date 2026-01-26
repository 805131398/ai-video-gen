import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCopywriting } from "@/lib/ai/text-generator";

// POST /api/ai/copywriting - 生成文案
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, title, count, attributes } = body;

    if (!topic || !title) {
      return NextResponse.json({ error: "主题和标题不能为空" }, { status: 400 });
    }

    const copies = await generateCopywriting(
      { topic, title, count, attributes },
      session.user.id,
      session.user.tenantId
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
