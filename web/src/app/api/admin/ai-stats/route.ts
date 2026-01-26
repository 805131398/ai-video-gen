import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ai-stats - 获取 AI 使用统计
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const modelType = searchParams.get("modelType");
    const period = searchParams.get("period") || "day"; // day, week, month

    // Build date filter
    const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (startDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = { ...dateFilter.createdAt, lte: new Date(endDate) };
    }

    // Build where clause
    const where = {
      tenantId,
      ...dateFilter,
      ...(modelType ? { modelType: modelType as any } : {}),
    };

    // Get statistics
    const [totalCalls, successCalls, totalCost, totalTokens, byModelType, recentLogs] =
      await Promise.all([
        // Total calls
        prisma.aIUsageLog.count({ where }),
        // Successful calls
        prisma.aIUsageLog.count({ where: { ...where, status: "SUCCESS" } }),
        // Total cost
        prisma.aIUsageLog.aggregate({
          where,
          _sum: { cost: true },
        }),
        // Total tokens
        prisma.aIUsageLog.aggregate({
          where,
          _sum: { inputTokens: true, outputTokens: true },
        }),
        // By model type
        prisma.aIUsageLog.groupBy({
          by: ["modelType"],
          where,
          _count: true,
          _sum: { cost: true, inputTokens: true, outputTokens: true },
        }),
        // Recent logs
        prisma.aIUsageLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: { select: { name: true, email: true } },
            modelConfig: { select: { providerName: true, modelName: true } },
          },
        }),
      ]);

    // Calculate average latency
    const avgLatency = await prisma.aIUsageLog.aggregate({
      where,
      _avg: { latencyMs: true },
    });

    return NextResponse.json({
      data: {
        summary: {
          totalCalls,
          successCalls,
          failedCalls: totalCalls - successCalls,
          successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0,
          totalCost: Number(totalCost._sum.cost || 0),
          totalInputTokens: totalTokens._sum.inputTokens || 0,
          totalOutputTokens: totalTokens._sum.outputTokens || 0,
          avgLatencyMs: Math.round(avgLatency._avg.latencyMs || 0),
        },
        byModelType: byModelType.map((item) => ({
          modelType: item.modelType,
          count: item._count,
          cost: Number(item._sum.cost || 0),
          inputTokens: item._sum.inputTokens || 0,
          outputTokens: item._sum.outputTokens || 0,
        })),
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          modelType: log.modelType,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          cost: Number(log.cost),
          latencyMs: log.latencyMs,
          status: log.status,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt,
          user: log.user,
          modelConfig: log.modelConfig,
        })),
      },
    });
  } catch (error) {
    console.error("获取统计数据失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}