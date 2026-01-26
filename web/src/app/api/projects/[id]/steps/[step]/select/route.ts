import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROUTE_TO_STEP, getNextRouteStep, type RouteStep } from "@/types/ai-video";

// POST /api/projects/[id]/steps/[step]/select - 选择选项并推进到下一步
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; step: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, step } = await params;
    const body = await request.json();
    const { optionId, optionIds } = body as { optionId?: string; optionIds?: string[] };

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

    // 验证步骤类型
    const validSteps: RouteStep[] = ["title", "copy", "images", "videos"];
    if (!validSteps.includes(step as RouteStep)) {
      return NextResponse.json({ error: "该步骤不支持选择操作" }, { status: 400 });
    }

    const stepType = ROUTE_TO_STEP[step as RouteStep];

    // 获取步骤
    const projectStep = await prisma.projectStep.findFirst({
      where: { versionId, stepType },
      include: { options: true },
    });

    if (!projectStep) {
      return NextResponse.json({ error: "步骤不存在" }, { status: 404 });
    }

    // 处理单选或多选
    const idsToSelect = optionIds || (optionId ? [optionId] : []);
    if (idsToSelect.length === 0) {
      return NextResponse.json({ error: "请选择至少一个选项" }, { status: 400 });
    }

    // 验证选项存在
    const validOptions = projectStep.options.filter((o) => idsToSelect.includes(o.id));
    if (validOptions.length !== idsToSelect.length) {
      return NextResponse.json({ error: "部分选项不存在" }, { status: 400 });
    }

    // 更新选中状态
    await prisma.stepOption.updateMany({
      where: { stepId: projectStep.id },
      data: { isSelected: false },
    });

    await prisma.stepOption.updateMany({
      where: { id: { in: idsToSelect } },
      data: { isSelected: true },
    });

    // 更新步骤的 selectedOptionId（单选时）
    if (optionId) {
      await prisma.projectStep.update({
        where: { id: projectStep.id },
        data: { selectedOptionId: optionId },
      });
    }

    // 获取下一步
    const nextStep = getNextRouteStep(step as RouteStep);

    return NextResponse.json({
      success: true,
      nextStep,
    });
  } catch (error) {
    console.error("选择选项失败:", error);
    const message = error instanceof Error ? error.message : "选择失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
