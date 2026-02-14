import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/upload-configs/[id]
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
    const config = await prisma.aIProviderUploadConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("获取上传配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/admin/upload-configs/[id]
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

    const config = await prisma.aIProviderUploadConfig.update({
      where: { id },
      data: {
        providerName: body.providerName,
        displayName: body.displayName,
        uploadUrl: body.uploadUrl,
        authType: body.authType,
        apiKey: body.apiKey,
        responseUrlPath: body.responseUrlPath,
        config: body.config,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("更新上传配置失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/upload-configs/[id]
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
    await prisma.aIProviderUploadConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除上传配置失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
