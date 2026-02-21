import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; humanId: string }>;
};

// PUT /api/projects/[id]/characters/[characterId]/digital-humans/[humanId]/select - 选择数字人
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: characterId, humanId } = await context.params;

    // 验证角色归属
    const character = await prisma.projectCharacter.findFirst({
      where: {
        id: characterId,
        userId: user.id
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "角色不存在或无权访问" },
        { status: 404 }
      );
    }



    // 验证数字人归属
    const digitalHuman = await prisma.digitalHuman.findFirst({
      where: {
        id: humanId,
        characterId,
      },
    });

    if (!digitalHuman) {
      return NextResponse.json(
        { error: "数字人不存在" },
        { status: 404 }
      );
    }

    // 使用事务：取消该角色的其他选中，设置当前为选中
    await prisma.$transaction([
      // 取消该角色的所有选中
      prisma.digitalHuman.updateMany({
        where: { characterId },
        data: { isSelected: false },
      }),
      // 设置当前为选中
      prisma.digitalHuman.update({
        where: { id: humanId },
        data: { isSelected: true },
      }),
    ]);

    const updated = await prisma.digitalHuman.findUnique({
      where: { id: humanId },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("选择数字人失败:", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
