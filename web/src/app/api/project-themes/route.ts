import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/project-themes - 获取项目主题列表
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const where = {
      ...(isActive !== null && { isActive: isActive === "true" }),
    };

    const themes = await prisma.projectTheme.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: themes });
  } catch (error) {
    console.error("获取项目主题列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/project-themes - 创建项目主题
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, keywords, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: "主题名称不能为空" },
        { status: 400 }
      );
    }

    const theme = await prisma.projectTheme.create({
      data: {
        name,
        description,
        keywords: keywords || [],
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    console.error("创建项目主题失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
