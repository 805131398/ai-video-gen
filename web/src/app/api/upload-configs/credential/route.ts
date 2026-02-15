import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { deriveKey, encrypt } from "@/lib/crypto";

// GET /api/upload-configs/credential?providerName=toapis
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get("providerName");

    const config = await prisma.aIProviderUploadConfig.findFirst({
      where: {
        isActive: true,
        ...(providerName && { providerName }),
      },
      orderBy: { createdAt: "asc" },
    });

    if (!config) {
      return NextResponse.json(
        { error: providerName ? `未找到 ${providerName} 的上传配置` : "无可用上传配置" },
        { status: 404 }
      );
    }

    const key = deriveKey(user.id);
    const { encrypted, iv, authTag } = encrypt(config.apiKey, key);

    return NextResponse.json({
      success: true,
      data: {
        providerName: config.providerName,
        displayName: config.displayName,
        uploadUrl: config.uploadUrl,
        authType: config.authType,
        encryptedApiKey: encrypted,
        iv,
        authTag,
        responseUrlPath: config.responseUrlPath,
        config: config.config,
      },
    });
  } catch (error) {
    console.error("获取上传凭证失败:", error);
    return NextResponse.json({ error: "获取凭证失败" }, { status: 500 });
  }
}
