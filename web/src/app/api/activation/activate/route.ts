import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { activateCode } from '@/lib/services/activation-service';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '卡密格式错误' }, { status: 400 });
    }

    const result = await activateCode(user.id, code.trim());

    return NextResponse.json({
      success: true,
      data: {
        type: result.type,
        expiresAt: result.expiresAt.toISOString(),
        daysAdded: result.daysAdded,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_CODE') {
        return NextResponse.json(
          { error: 'INVALID_CODE', message: '卡密不存在' },
          { status: 400 }
        );
      }
      if (error.message === 'CODE_ALREADY_USED') {
        return NextResponse.json(
          { error: 'CODE_ALREADY_USED', message: '卡密已被使用' },
          { status: 400 }
        );
      }
    }
    console.error('激活卡密失败:', error);
    return NextResponse.json({ error: '激活失败' }, { status: 500 });
  }
}
