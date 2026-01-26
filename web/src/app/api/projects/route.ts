import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@/generated/prisma/enums";

// GET /api/projects - 获取作品列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const where = {
      userId: session.user.id,
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { topic } = body;

    // 创建作品和初始版本（允许空主题，用于先创建后编辑流程）
    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        topic: topic || "",
        status: ProjectStatus.DRAFT,
        versions: {
          create: {
            versionNo: 1,
            isMain: true,
            currentStep: "TOPIC_INPUT",
          },
        },
      },
      include: {
        versions: true,
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
