import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/scripts/[scriptId] - 获取剧本详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, scriptId } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取剧本详情
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId: id,
      },
      include: {
        character: true,
        scenes: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!script) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: script });
  } catch (error) {
    console.error("获取剧本详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/projects/[id]/scripts/[scriptId] - 更新剧本
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, scriptId } = await params;
    const body = await request.json();

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证剧本归属
    const existing = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId: id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    // 更新剧本
    const script = await prisma.projectScript.update({
      where: { id: scriptId },
      data: {
        title: body.title,
        description: body.description,
        isActive: body.isActive,
      },
      include: {
        character: true,
        scenes: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({ data: script });
  } catch (error) {
    console.error("更新剧本失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/scripts/[scriptId] - 删除剧本
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, scriptId } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证剧本归属
    const existing = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId: id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    // 删除剧本（级联删除场景）
    await prisma.projectScript.delete({
      where: { id: scriptId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除剧本失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
