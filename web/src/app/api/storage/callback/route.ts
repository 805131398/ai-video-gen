// POST /api/storage/callback - 上传完成回调

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StorageFactory } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { key, size, mimeType, originalName, businessType, businessId } = body;

    // 验证必填字段
    if (!key || !size || !mimeType || !originalName) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 初始化存储
    try {
      StorageFactory.getAdapter();
    } catch {
      StorageFactory.initializeFromEnv();
    }

    // 验证文件是否存在
    const adapter = StorageFactory.getAdapter();
    const exists = await adapter.exists(key);
    if (!exists) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 400 }
      );
    }

    // 获取默认存储提供商
    const provider = await prisma.storageProvider.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "未配置存储提供商" },
        { status: 500 }
      );
    }

    // 创建文件记录
    const file = await prisma.file.create({
      data: {
        tenantId: session.user.tenantId,
        providerId: provider.id,
        originalName,
        storageKey: key,
        fileUrl: adapter.getPublicUrl(key),
        fileType: mimeType,
        fileSize: BigInt(size),
        businessType,
        businessId,
        createdById: session.user.id,
      },
    });

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
    console.error("上传回调失败:", error);
    return NextResponse.json({ error: "上传回调失败" }, { status: 500 });
  }
}
