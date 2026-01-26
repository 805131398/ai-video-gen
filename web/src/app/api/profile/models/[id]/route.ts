import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIModelType } from "@/generated/prisma/enums";

// PATCH /api/profile/models/[id] - 更新用户模型配置
export async function PATCH(
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

    // 验证配置是否属于当前用户
    const existingConfig = await prisma.aIModelConfig.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    // 如果设为默认，先取消其他同类型的默认配置
    if (body.isDefault && !existingConfig.isDefault) {
      await prisma.aIModelConfig.updateMany({
        where: {
          userId: session.user.id,
          modelType: existingConfig.modelType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

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
    console.error("更新模型配置失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/profile/models/[id] - 删除用户模型配置
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

    // 验证配置是否属于当前用户
    const existingConfig = await prisma.aIModelConfig.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    await prisma.aIModelConfig.delete({
      where: { id },
    });

    return NextResponse.json({ message: "已删除" });
  } catch (error) {
    console.error("删除模型配置失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
