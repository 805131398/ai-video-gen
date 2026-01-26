import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateType } from "@/generated/prisma";

// GET /api/admin/templates - 获取模板列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get("templateType") as TemplateType | null;
    const category = searchParams.get("category");

    const templates = await prisma.promptTemplate.findMany({
      where: {
        OR: [
          { tenantId: null, isSystem: true },
          { tenantId: session.user.tenantId },
        ],
        ...(templateType && { templateType }),
        ...(category && { category }),
        isActive: true,
      },
      orderBy: [{ isSystem: "desc" }, { usageCount: "desc" }],
    });

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("获取模板列表失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/admin/templates - 创建模板
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();

    const template = await prisma.promptTemplate.create({
      data: {
        tenantId: session.user.tenantId,
        templateType: body.templateType,
        name: body.name,
        description: body.description,
        category: body.category,
        promptContent: body.promptContent,
        variables: body.variables,
        isSystem: false,
        isActive: true,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("创建模板失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
