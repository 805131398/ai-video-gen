import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; characterId: string }>;
};

// GET /api/projects/[id]/characters/[characterId]/digital-humans - 获取数字人历史记录
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

    // 验证角色归属
    const character = await prisma.projectCharacter.findFirst({
      where: {
        id: characterId,
        projectId,
      },
    });

    if (!character) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }

    // 获取数字人列表
    const digitalHumans = await prisma.digitalHuman.findMany({
      where: { characterId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: digitalHumans });
  } catch (error) {
    console.error("获取数字人列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
