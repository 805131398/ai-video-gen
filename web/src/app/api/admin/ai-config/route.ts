import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIModelType } from "@/generated/prisma/enums";

// GET /api/admin/ai-config - 获取 AI 配置列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const modelType = searchParams.get("modelType") as AIModelType | null;

    const configs = await prisma.aIModelConfig.findMany({
      where: {
        tenantId: session.user.tenantId || null,
        userId: null, // 只获取系统/租户级配置
        ...(modelType && { modelType }),
      },
      orderBy: [{ modelType: "asc" }, { priority: "desc" }],
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("获取 AI 配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/admin/ai-config - 创建 AI 配置
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();

    const config = await prisma.aIModelConfig.create({
      data: {
        tenantId: session.user.tenantId,
        modelType: body.modelType,
        providerName: body.providerName,
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
        modelName: body.modelName,
        config: body.config,
        isDefault: body.isDefault || false,
        isActive: body.isActive ?? true,
        priority: body.priority || 0,
      },
    });

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    console.error("创建 AI 配置失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
