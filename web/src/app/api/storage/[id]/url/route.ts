// GET /api/storage/[id]/url - 获取文件访问 URL

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StorageFactory } from "@/lib/storage";

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
    const { searchParams } = new URL(request.url);
    const expiresIn = parseInt(searchParams.get("expiresIn") || "3600");

    const file = await prisma.file.findUnique({
      where: { id, isDeleted: false },
    });

    if (!file) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // 初始化存储
    try {
      StorageFactory.getAdapter();
    } catch {
      StorageFactory.initializeFromEnv();
    }

    const adapter = StorageFactory.getAdapter();
    const signedUrl = await adapter.getDownloadSignedUrl(file.storageKey, expiresIn);

    return NextResponse.json({
      data: {
        url: signedUrl,
        expires: Date.now() + expiresIn * 1000,
      },
    });
  } catch (error) {
    console.error("获取文件 URL 失败:", error);
    return NextResponse.json({ error: "获取文件 URL 失败" }, { status: 500 });
  }
}
