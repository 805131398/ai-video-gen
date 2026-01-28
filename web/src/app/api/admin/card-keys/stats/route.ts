import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkSuperAdmin } from '@/lib/permission';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // 'today' or 'month'

    let startDate: Date;
    const now = new Date();

    if (period === 'today') {
      // 今天的开始时间
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'month') {
      // 本月的开始时间
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      return NextResponse.json({ error: '无效的时间周期' }, { status: 400 });
    }

    const count = await prisma.activationLog.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('查询激活统计失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
