import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSubscriptionStatus } from '@/lib/services/activation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const status = await getSubscriptionStatus(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        expiresAt: status.expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('查询订阅状态失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
