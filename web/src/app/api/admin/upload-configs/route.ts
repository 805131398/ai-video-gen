import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/upload-configs - 获取上传配置列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const configs = await prisma.aIProviderUploadConfig.findMany({
      where: { tenantId: null },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("获取上传配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/admin/upload-configs - 创建上传配置
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();

    const config = await prisma.aIProviderUploadConfig.create({
      data: {
        providerName: body.providerName,
        displayName: body.displayName,
        uploadUrl: body.uploadUrl,
        authType: body.authType,
        apiKey: body.apiKey,
        responseUrlPath: body.responseUrlPath,
        config: body.config || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    console.error("创建上传配置失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
