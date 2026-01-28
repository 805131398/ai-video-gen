import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/ai-config/[id] - 获取单个 AI 配置
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

    const config = await prisma.aIModelConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("获取 AI 配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/admin/ai-config/[id] - 更新 AI 配置
export async function PUT(
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

    const config = await prisma.aIModelConfig.update({
      where: { id },
      data: {
        providerName: body.providerName,
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
        modelName: body.modelName,
        config: body.config,
        isDefault: body.isDefault,
        isActive: body.isActive,
        priority: body.priority,
      },
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("更新 AI 配置失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/ai-config/[id] - 删除 AI 配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.aIModelConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除 AI 配置失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
