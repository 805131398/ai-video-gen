import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/templates/[id] - 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const template = await prisma.promptTemplate.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        promptContent: body.promptContent,
        variables: body.variables,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ data: template });
  } catch (error) {
    console.error("更新模板失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/templates/[id] - 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.promptTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除模板失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
