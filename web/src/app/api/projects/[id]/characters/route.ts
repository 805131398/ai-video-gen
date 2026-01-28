import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/[id]/characters - 获取项目角色列表
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId } = await context.params;

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

    const characters = await prisma.projectCharacter.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ data: characters });
  } catch (error) {
    console.error("获取项目角色列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/projects/[id]/characters - 创建项目角色
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId } = await context.params;

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

    if (!name || !description) {
      return NextResponse.json(
        { error: "角色名称和描述不能为空" },
        { status: 400 }
      );
    }

    const character = await prisma.projectCharacter.create({
      data: {
        projectId,
        name,
        description,
        avatarUrl,
        attributes,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("创建项目角色失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
