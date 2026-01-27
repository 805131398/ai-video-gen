import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/projects/[id]/steps/images/[imageId] - 删除图片
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id: projectId, imageId } = await params;

    // 验证项目归属
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // 验证图片选项存在且属于该项目
    const option = await prisma.stepOption.findFirst({
      where: { id: imageId },
      include: {
        step: {
          include: {
            version: true,
          },
        },
      },
    });

    if (!option || option.step.version.projectId !== projectId) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    // 删除图片选项
    await prisma.stepOption.delete({
      where: { id: imageId },
    });

    // TODO: 如果是云存储的图片，还需要删除云端文件

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除图片失败:", error);
    const message = error instanceof Error ? error.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
