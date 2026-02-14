import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ai-logs - 获取 AI 调用日志列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const searchParams = request.nextUrl.searchParams;

    console.log("[AI Logs API] Request from user:", session.user.id, "tenantId:", tenantId);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const modelType = searchParams.get("modelType");
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const projectId = searchParams.get("projectId");
    const modelConfigId = searchParams.get("modelConfigId");
    const keyword = searchParams.get("keyword");
    const taskId = searchParams.get("taskId");

    // Build where clause
    const where: any = { tenantId };

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }
    if (modelType) {
      where.modelType = modelType;
    }
    if (status) {
      where.status = status;
    }
    if (userId) {
      where.userId = userId;
    }
    if (projectId) {
      where.projectId = projectId;
    }
    if (modelConfigId) {
      where.modelConfigId = modelConfigId;
    }
    if (taskId) {
      where.taskId = { contains: taskId, mode: "insensitive" };
    }
    if (keyword) {
      where.OR = [
        { requestUrl: { contains: keyword, mode: "insensitive" } },
        { errorMessage: { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          modelType: true,
          inputTokens: true,
          outputTokens: true,
          cost: true,
          latencyMs: true,
          status: true,
          errorMessage: true,
          requestUrl: true,
          taskId: true,
          requestCount: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          project: { select: { id: true, title: true } },
          modelConfig: { select: { providerName: true, modelName: true } },
        },
      }),
      prisma.aIUsageLog.count({ where }),
    ]);

    console.log("[AI Logs API] Found", total, "logs, returning", logs.length, "items for page", page);

    return NextResponse.json({
      data: logs.map((log) => ({
        ...log,
        cost: Number(log.cost),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("获取日志列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
