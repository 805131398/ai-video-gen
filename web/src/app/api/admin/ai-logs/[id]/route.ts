import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ai-logs/[id] - 获取单条日志详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    const log = await prisma.aIUsageLog.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { id: true, title: true } },
        modelConfig: { select: { providerName: true, modelName: true, modelType: true } },
      },
    });

    if (!log) {
      return NextResponse.json({ error: "日志不存在" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...log,
        cost: Number(log.cost),
      },
    });
  } catch (error) {
    console.error("获取日志详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
