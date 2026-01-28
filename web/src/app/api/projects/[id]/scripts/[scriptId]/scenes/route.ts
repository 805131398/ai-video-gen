import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/scripts/[scriptId]/scenes - 获取剧本的所有场景
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

    // 验证剧本归属
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId: id,
      },
    });

    if (!script) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    // 获取场景列表
    const scenes = await prisma.scriptScene.findMany({
      where: { scriptId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ data: scenes });
  } catch (error) {
    console.error("获取场景列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/projects/[id]/scripts/[scriptId]/scenes - 创建新场景
export async function POST(
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
    const script = await prisma.projectScript.findFirst({
      where: {
        id: scriptId,
        projectId: id,
      },
    });

    if (!script) {
      return NextResponse.json({ error: "剧本不存在" }, { status: 404 });
    }

    // 获取当前最大排序号
    const maxSortOrder = await prisma.scriptScene.findFirst({
      where: { scriptId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // 创建场景
    const scene = await prisma.scriptScene.create({
      data: {
        scriptId,
        title: body.title || "新场景",
        sortOrder: (maxSortOrder?.sortOrder ?? -1) + 1,
        duration: body.duration,
        content: body.content || {
          description: "",
          sceneType: "indoor",
          characters: [],
          dialogues: [],
          camera: { type: "medium", movement: "static" },
          visual: { transition: "fade", effects: [], subtitleStyle: "default" },
          audio: { bgm: "", soundEffects: [] },
        },
      },
    });

    return NextResponse.json({ data: scene });
  } catch (error) {
    console.error("创建场景失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
