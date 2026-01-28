import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/project-themes/[id] - 获取单个主题
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await context.params;

    const theme = await prisma.projectTheme.findUnique({
      where: { id },
    });

    if (!theme) {
      return NextResponse.json({ error: "主题不存在" }, { status: 404 });
    }

    return NextResponse.json(theme);
  } catch (error) {
    console.error("获取主题失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/project-themes/[id] - 更新主题
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, description, keywords, isActive, sortOrder } = body;

    const theme = await prisma.projectTheme.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(keywords !== undefined && { keywords }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(theme);
  } catch (error) {
    console.error("更新主题失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/project-themes/[id] - 删除主题
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await context.params;

    // 检查是否有项目使用此主题
    const projectCount = await prisma.project.count({
      where: { themeId: id },
    });

    if (projectCount > 0) {
      return NextResponse.json(
        { error: `无法删除，有 ${projectCount} 个项目正在使用此主题` },
        { status: 400 }
      );
    }

    await prisma.projectTheme.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除主题失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
