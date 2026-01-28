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

    // 使用事务更新剧本和角色关联
    const script = await prisma.$transaction(async (tx) => {
      // 删除旧的角色关联
      await tx.scriptCharacter.deleteMany({
        where: { scriptId },
      });

      // 更新剧本并创建新的角色关联
      return tx.projectScript.update({
        where: { id: scriptId },
        data: {
          name,
          title: name,
          tone: tone || null,
          synopsis: synopsis || null,
          description: synopsis || null,
          // 向后兼容：设置第一个角色为 characterId
          characterId: characterIds[0],
          // 创建新的角色关联
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
          scenes: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ data: script });
  } catch (error) {
    console.error("更新剧本失败:", error);
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
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
