import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/projects/[id]/steps/images/select - 选择图片并推进到下一步
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
    const { optionId, optionIds } = body as { optionId?: string; optionIds?: string[] };

    console.log("[images/select] 选择图片", { projectId, optionId, optionIds, userId: session.user.id });

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

    // 获取图片选择步骤
    const imageStep = await prisma.projectStep.findFirst({
      where: { versionId, stepType: "IMAGE_SELECT" },
      include: { options: true },
    });

    if (!imageStep) {
      return NextResponse.json({ error: "图片步骤不存在" }, { status: 404 });
    }

    // 处理单选或多选
    const idsToSelect = optionIds || (optionId ? [optionId] : []);
    if (idsToSelect.length === 0) {
      return NextResponse.json({ error: "请选择至少一个图片" }, { status: 400 });
    }

    // 验证选项存在
    const validOptions = imageStep.options.filter((o) => idsToSelect.includes(o.id));
    if (validOptions.length !== idsToSelect.length) {
      return NextResponse.json({ error: "部分图片选项不存在" }, { status: 400 });
    }

    // 更新选中状态（先清空所有，再设置选中的）
    await prisma.stepOption.updateMany({
      where: { stepId: imageStep.id },
      data: { isSelected: false },
    });

    await prisma.stepOption.updateMany({
      where: { id: { in: idsToSelect } },
      data: { isSelected: true },
    });

    // 更新步骤的 selectedOptionId（单选时）
    if (optionId) {
      await prisma.projectStep.update({
        where: { id: imageStep.id },
        data: { selectedOptionId: optionId },
      });
    }

    // 推进到下一步：VIDEO_SELECT
    await prisma.projectVersion.update({
      where: { id: versionId },
      data: { currentStep: "VIDEO_SELECT" },
    });

    console.log("[images/select] 图片选择成功，推进到 VIDEO_SELECT");

    return NextResponse.json({
      success: true,
      nextStep: "videos",
    });
  } catch (error) {
    console.error("[images/select] 选择图片失败:", error);
    const message = error instanceof Error ? error.message : "选择失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
