import { NextRequest, NextResponse } from "next/server";
import { verify, sign } from "jsonwebtoken";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "缺少刷新令牌" },
        { status: 400 }
      );
    }

    // 验证刷新令牌
    let decoded: any;
    try {
      decoded = verify(refresh_token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: "刷新令牌无效或已过期" },
        { status: 401 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "用户不存在或已被禁用" },
        { status: 401 }
      );
    }

    // 生成新的访问令牌
    const accessToken = sign(
      {
        id: user.id,
        phone: user.phone,
        email: user.email,
        tenantId: user.tenantId,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 生成新的刷新令牌
    const newRefreshToken = sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // 返回新的令牌
    return NextResponse.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "刷新令牌失败，请重新登录" },
      { status: 500 }
    );
  }
}
