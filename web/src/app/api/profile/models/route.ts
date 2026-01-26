import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIModelType } from "@/generated/prisma";

// GET /api/profile/models - 获取用户的模型配置
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const configs = await prisma.aIModelConfig.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [{ modelType: "asc" }, { priority: "desc" }],
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("获取模型配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/profile/models - 创建用户模型配置
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();

    // 验证必填字段
    if (!body.modelType || !body.providerName || !body.apiUrl || !body.apiKey || !body.modelName) {
      return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
    }

    // 如果设为默认，先取消其他同类型的默认配置
    if (body.isDefault) {
      await prisma.aIModelConfig.updateMany({
        where: {
          userId: session.user.id,
          modelType: body.modelType as AIModelType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const config = await prisma.aIModelConfig.create({
      data: {
        userId: session.user.id,
        modelType: body.modelType as AIModelType,
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
    console.error("创建模型配置失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
