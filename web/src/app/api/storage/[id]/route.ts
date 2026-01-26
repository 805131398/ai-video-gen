// GET/DELETE /api/storage/[id] - 获取/删除文件

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StorageFactory } from "@/lib/storage";

// GET /api/storage/[id] - 获取文件信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;

    const file = await prisma.file.findUnique({
      where: { id, isDeleted: false },
    });

    if (!file) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: file.id,
        originalName: file.originalName,
        storageKey: file.storageKey,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileSize: Number(file.fileSize),
        businessType: file.businessType,
        businessId: file.businessId,
        createdAt: file.createdAt,
      },
    });
  } catch (error) {
    console.error("获取文件失败:", error);
    return NextResponse.json({ error: "获取文件失败" }, { status: 500 });
  }
}

// DELETE /api/storage/[id] - 删除文件（软删除）
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

    const file = await prisma.file.findUnique({
      where: { id, isDeleted: false },
    });

    if (!file) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // 软删除文件记录
    await prisma.file.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedById: session.user.id,
        deletedAt: new Date(),
      },
    });

    // 可选：从存储中删除实际文件
    // 建议通过定时任务批量清理已删除文件
    // try {
    //   StorageFactory.initializeFromEnv();
    //   const adapter = StorageFactory.getAdapter();
    //   await adapter.delete(file.storageKey);
    // } catch (e) {
    //   console.error("删除存储文件失败:", e);
    // }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除文件失败:", error);
    return NextResponse.json({ error: "删除文件失败" }, { status: 500 });
  }
}
