import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateImages, generateImagePromptFromCopy } from "@/lib/ai/image-generator";

// POST /api/ai/images - 生成图片
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, copywriting, count, size, style, negativePrompt } = body;

    let finalPrompt = prompt;

    // 如果提供了文案但没有提示词，自动生成提示词
    if (!prompt && copywriting) {
      const result = await generateImagePromptFromCopy(
        copywriting,
        style,
        session.user.id,
        session.user.tenantId
      );
      finalPrompt = result.prompt;  // 只使用英文提示词
    }

    if (!finalPrompt) {
      return NextResponse.json({ error: "提示词不能为空" }, { status: 400 });
    }

    const images = await generateImages(
      { prompt: finalPrompt, negativePrompt, count, size, style },
      session.user.id,
      session.user.tenantId
    );

    return NextResponse.json({ data: images });
  } catch (error) {
    console.error("生成图片失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
