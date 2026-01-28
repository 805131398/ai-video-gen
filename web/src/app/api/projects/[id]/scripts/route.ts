import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/scripts - 获取项目的所有剧本
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 获取项目的所有剧本
    const scripts = await prisma.projectScript.findMany({
      where: { projectId: id },
      include: {
        character: true,
        scenes: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: scripts });
  } catch (error) {
    console.error("获取剧本列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/projects/[id]/scripts - 创建新剧本
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证角色归属
    const character = await prisma.projectCharacter.findFirst({
      where: {
        id: body.characterId,
        projectId: id,
      },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    // 创建剧本
    const script = await prisma.projectScript.create({
      data: {
        projectId: id,
        characterId: body.characterId,
        title: body.title || `${character.name}的剧本`,
        description: body.description,
        version: 1,
        isActive: true,
      },
      include: {
        character: true,
        scenes: true,
      },
    });

    return NextResponse.json({ data: script });
  } catch (error) {
    console.error("创建剧本失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
