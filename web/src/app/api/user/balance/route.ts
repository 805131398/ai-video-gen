import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// GET /api/user/balance - 获取用户余额 (支持 JWT token 认证)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        balance: true,
        energy: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      balance: user.balance || 0,
      energy: user.energy || 0,
    });
  } catch (error) {
    console.error("获取用户余额失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
