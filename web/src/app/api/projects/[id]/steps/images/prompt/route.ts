import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateImagePromptFromCopy } from "@/lib/ai/image-generator";

// POST /api/projects/[id]/steps/images/prompt - 生成图片提示词
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { style } = body;

    console.log("[images/prompt] 开始生成提示词", { projectId, style, userId: session.user.id });

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { versions: { where: { isMain: true }, take: 1 } },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const versionId = project.currentVersionId || project.versions[0]?.id;
    if (!versionId) {
      return NextResponse.json({ error: "版本不存在" }, { status: 404 });
    }

    // 获取选中的文案内容
    const copyStep = await prisma.projectStep.findFirst({
      where: { versionId, stepType: "COPY_SELECT" },
      include: { options: { where: { isSelected: true } } },
    });

    // 使用选中的文案内容，如果没有则使用项目主题
    const copyContent = copyStep?.options[0]?.content || project.topic;
    console.log("[images/prompt] 文案内容:", copyContent?.substring(0, 100));

    // 调用提示词生成服务
    console.log("[images/prompt] 调用 generateImagePromptFromCopy...");
    const result = await generateImagePromptFromCopy(
      copyContent,
      style,
      session.user.id,
      undefined
    );

    console.log("[images/prompt] 提示词生成成功", {
      promptLength: result.prompt?.length,
      translationLength: result.translation?.length,
      promptPreview: result.prompt?.substring(0, 100),
      translationPreview: result.translation?.substring(0, 100),
    });

    // 返回双语提示词结果
    return NextResponse.json({
      prompt: result.prompt,
      translation: result.translation,
    });
  } catch (error) {
    console.error("[images/prompt] 生成提示词失败:", error);
    const message = error instanceof Error ? error.message : "生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
