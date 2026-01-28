import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; characterId: string }>;
};

// GET /api/projects/[id]/characters/[characterId] - 获取单个角色
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, characterId } = await context.params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在或无权访问" },
        { status: 404 }
      );
    }

    const character = await prisma.projectCharacter.findFirst({
      where: {
        id: characterId,
        projectId,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json(character);
  } catch (error) {
    console.error("获取角色失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/projects/[id]/characters/[characterId] - 更新角色
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, characterId } = await context.params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在或无权访问" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, avatarUrl, attributes, sortOrder } = body;

    const character = await prisma.projectCharacter.update({
      where: {
        id: characterId,
        projectId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(attributes !== undefined && { attributes }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(character);
  } catch (error) {
    console.error("更新角色失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/characters/[characterId] - 删除角色
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, characterId } = await context.params;

    // 验证项目所有权
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "项目不存在或无权访问" },
        { status: 404 }
      );
    }

    await prisma.projectCharacter.delete({
      where: {
        id: characterId,
        projectId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除角色失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
