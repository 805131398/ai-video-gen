import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId] - 获取场景详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string; sceneId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, scriptId, sceneId } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取场景详情
    const scene = await prisma.scriptScene.findFirst({
      where: {
        id: sceneId,
        scriptId,
        script: {
          projectId: id,
        },
      },
    });

    if (!scene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: scene });
  } catch (error) {
    console.error("获取场景详情失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId] - 更新场景
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string; sceneId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, scriptId, sceneId } = await params;
    const body = await request.json();

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证场景归属
    const existing = await prisma.scriptScene.findFirst({
      where: {
        id: sceneId,
        scriptId,
        script: {
          projectId: id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    // 更新场景
    const scene = await prisma.scriptScene.update({
      where: { id: sceneId },
      data: {
        title: body.title,
        sortOrder: body.sortOrder,
        duration: body.duration,
        content: body.content,
      },
    });

    return NextResponse.json({ data: scene });
  } catch (error) {
    console.error("更新场景失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/scripts/[scriptId]/scenes/[sceneId] - 删除场景
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string; sceneId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id, scriptId, sceneId } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证场景归属
    const existing = await prisma.scriptScene.findFirst({
      where: {
        id: sceneId,
        scriptId,
        script: {
          projectId: id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    // 删除场景
    await prisma.scriptScene.delete({
      where: { id: sceneId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除场景失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
