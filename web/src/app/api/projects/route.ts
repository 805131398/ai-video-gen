import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import type { ProjectStatus } from "@/types/ai-video";

// GET /api/projects - 获取作品列表
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const where = {
      userId: user.id,
      ...(status && { status }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          versions: {
            where: { isMain: true },
            take: 1,
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("获取作品列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/projects - 创建新作品
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, themeId, themeName, themeDesc, characters } = body;

    // 创建作品和初始版本（允许空主题，用于先创建后编辑流程）
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId || null,
        topic: topic || "",
        status: "DRAFT",
        themeId,
        themeName,
        themeDesc,
        versions: {
          create: {
            versionNo: 1,
            isMain: true,
            currentStep: "TOPIC_INPUT",
          },
        },
        // 如果提供了角色数据，一起创建
        ...(characters && characters.length > 0 && {
          characters: {
            create: characters.map((char: any, index: number) => ({
              name: char.name,
              description: char.description,
              avatarUrl: char.avatarUrl,
              attributes: char.attributes,
              sortOrder: char.sortOrder ?? index,
            })),
          },
        }),
      },
      include: {
        versions: true,
        characters: true,
      },
    });

    // 更新 currentVersionId
    await prisma.project.update({
      where: { id: project.id },
      data: { currentVersionId: project.versions[0].id },
    });

    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (error) {
    console.error("创建作品失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
