import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';
import { getActivationHistory } from '@/lib/services/activation-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const history = await getActivationHistory(user.id);

    return NextResponse.json({
      success: true,
      records: history.map(item => ({
        id: item.id,
        code: item.code,
        type: item.type,
        activated_at: item.activatedAt.toISOString(),
        expires_at: new Date(
          item.activatedAt.getTime() + item.daysAdded * 24 * 60 * 60 * 1000
        ).toISOString(),
      })),
    });
  } catch (error) {
    console.error('查询激活历史失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
