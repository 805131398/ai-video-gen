import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StepType, StepStatus } from "@/generated/prisma";

// POST /api/projects/[id]/steps - 创建步骤记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { versionId, stepType, attributes } = body;

    // 验证作品归属
    const project = await prisma.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    // 创建步骤
    const step = await prisma.projectStep.create({
      data: {
        versionId,
        stepType: stepType as StepType,
        attributes,
        status: StepStatus.PENDING,
      },
    });

    return NextResponse.json({ data: step }, { status: 201 });
  } catch (error) {
    console.error("创建步骤失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
