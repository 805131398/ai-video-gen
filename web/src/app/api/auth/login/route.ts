import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { getSubscriptionStatus } from "@/lib/services/activation-service";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "请输入用户名和密码" },
        { status: 400 }
      );
    }

    // 查找用户（支持手机号或邮箱登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: username },
          { email: username },
        ],
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "用户不存在或密码未设置" },
        { status: 401 }
      );
    }

    // 验证密码
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "密码错误" },
        { status: 401 }
      );
    }

    // 检查账号状态
    if (!user.isActive) {
      return NextResponse.json(
        { error: "账号已被禁用" },
        { status: 403 }
      );
    }

    // 生成访问令牌
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

    // 生成刷新令牌
    const refreshToken = sign(
      { id: user.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // 查询用户订阅状态
    const subscriptionStatus = await getSubscriptionStatus(user.id);

    // 返回用户信息和令牌
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        tenantId: user.tenantId,
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      subscription: {
        is_active: subscriptionStatus.hasSubscription && !subscriptionStatus.isExpired,
        type: subscriptionStatus.type?.toLowerCase(),
        expires_at: subscriptionStatus.expiresAt?.toISOString(),
        days_remaining: subscriptionStatus.daysRemaining || 0,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 }
    );
  }
}
