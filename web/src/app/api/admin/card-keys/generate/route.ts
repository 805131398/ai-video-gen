import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateCodes } from '@/lib/services/activation-service';
import { ActivationCodeType } from '@/generated/prisma/enums';
import { checkSuperAdmin } from '@/lib/permission';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 权限检查：仅超级管理员
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { type, quantity } = body;

    if (!type || !Object.values(ActivationCodeType).includes(type)) {
      return NextResponse.json({ error: '卡密类型无效' }, { status: 400 });
    }

    if (!quantity || quantity < 1 || quantity > 1000) {
      return NextResponse.json({ error: '生成数量必须在 1-1000 之间' }, { status: 400 });
    }

    const result = await generateCodes({
      type,
      quantity,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('生成卡密失败:', error);
    return NextResponse.json({ error: '生成失败' }, { status: 500 });
  }
}
