import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StepStatus } from "@/generated/prisma";

// PUT /api/projects/[id]/steps/[sid] - 更新步骤
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, sid } = await params;
    const body = await request.json();

    // 验证作品归属
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    const step = await prisma.projectStep.update({
      where: { id: sid },
      data: {
        selectedOptionId: body.selectedOptionId,
        attributes: body.attributes,
        status: body.status as StepStatus,
      },
      include: {
        options: true,
      },
    });

    // 如果选择了选项，更新选项的 isSelected 状态
    if (body.selectedOptionId) {
      await prisma.stepOption.updateMany({
        where: { stepId: sid },
        data: { isSelected: false },
      });
      await prisma.stepOption.update({
        where: { id: body.selectedOptionId },
        data: { isSelected: true },
      });
    }

    return NextResponse.json({ data: step });
  } catch (error) {
    console.error("更新步骤失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
