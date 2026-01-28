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
        scriptCharacters: {
          include: {
            character: true,
          },
          orderBy: { sortOrder: "asc" },
        },
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
    const { name, tone, synopsis, characterIds } = body;

    // 验证必填字段
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "请输入剧本名称" },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "剧本名称不能超过 50 个字符" },
        { status: 400 }
      );
    }

    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json(
        { error: "请至少选择一个角色" },
        { status: 400 }
      );
    }

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证所有角色都属于该项目
    const characters = await prisma.projectCharacter.findMany({
      where: {
        id: { in: characterIds },
        projectId: id,
      },
    });

    if (characters.length !== characterIds.length) {
      return NextResponse.json(
        { error: "部分角色不存在或不属于该项目" },
        { status: 404 }
      );
    }

    // 创建剧本
    const script = await prisma.projectScript.create({
      data: {
        projectId: id,
        name,
        title: name, // title 字段保持与 name 一致
        tone: tone || null,
        synopsis: synopsis || null,
        description: synopsis || null, // description 字段保持与 synopsis 一致
        version: 1,
        isActive: true,
        // 向后兼容：设置第一个角色为 characterId
        characterId: characterIds[0],
        // 创建角色关联
        scriptCharacters: {
          create: characterIds.map((charId: string, index: number) => ({
            characterId: charId,
            sortOrder: index,
          })),
        },
      },
      include: {
        character: true,
        scriptCharacters: {
          include: {
            character: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        scenes: true,
      },
    });

    return NextResponse.json({ data: script });
  } catch (error) {
    console.error("创建剧本失败:", error);
    const message = error instanceof Error ? error.message : "创建失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
