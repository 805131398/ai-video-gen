import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { getSubscriptionStatus } from '@/lib/services/activation-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const status = await getSubscriptionStatus(user.id);

    // 转换为前端期望的格式
    return NextResponse.json({
      success: true,
      data: {
        isActive: status.hasSubscription && !status.isExpired,
        type: status.type,
        expiresAt: status.expiresAt?.toISOString(),
        daysRemaining: status.daysRemaining,
      },
    });
  } catch (error) {
    console.error('查询订阅状态失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
