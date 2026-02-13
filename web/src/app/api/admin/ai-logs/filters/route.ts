import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ai-logs/filters - 获取筛选选项
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const [users, projects, modelConfigs] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.project.findMany({
        where: { tenantId },
        select: { id: true, title: true },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      prisma.aIModelConfig.findMany({
        where: { tenantId },
        select: { id: true, providerName: true, modelName: true, modelType: true },
        orderBy: { providerName: "asc" },
      }),
    ]);

    return NextResponse.json({
      data: { users, projects, modelConfigs },
    });
  } catch (error) {
    console.error("获取筛选选项失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
