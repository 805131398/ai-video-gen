// POST /api/storage/upload-url - 获取客户端直传预签名 URL

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { StorageFactory, validateFile, BusinessType } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { filename, mimeType, size, businessType, businessId } = body as {
      filename: string;
      mimeType: string;
      size: number;
      businessType: BusinessType;
      businessId?: string;
    };

    // 验证必填字段
    if (!filename || !mimeType || !size || !businessType) {
      return NextResponse.json(
        { error: "缺少必填字段" },
        { status: 400 }
      );
    }

    // 验证文件类型和大小
    const validation = validateFile(mimeType, size);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // 初始化存储（如果尚未初始化）
    try {
      StorageFactory.getAdapter();
    } catch {
      StorageFactory.initializeFromEnv();
    }

    // 生成存储 key
    const tenantId = session.user.tenantId || "default";
    const key = StorageFactory.generateKey(tenantId, businessType, filename);

    // 获取预签名 URL
    const adapter = StorageFactory.getAdapter();
    const result = await adapter.getUploadSignedUrl(key, mimeType);

    return NextResponse.json({
      data: {
        ...result,
        originalName: filename,
        businessType,
        businessId,
      },
    });
  } catch (error) {
    console.error("获取上传 URL 失败:", error);
    return NextResponse.json({ error: "获取上传 URL 失败" }, { status: 500 });
  }
}
