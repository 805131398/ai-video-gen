import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActivationHistory } from '@/lib/services/activation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const history = await getActivationHistory(session.user.id);

    return NextResponse.json({
      success: true,
      data: history.map(item => ({
        ...item,
        activatedAt: item.activatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('查询激活历史失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
