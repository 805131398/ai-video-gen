import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ActivationCodeType, ActivationCodeStatus } from '@/generated/prisma/enums';
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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status as ActivationCodeStatus;
    }
    if (type && type !== 'all') {
      where.type = type as ActivationCodeType;
    }

    const [items, total] = await Promise.all([
      prisma.activationCode.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.activationCode.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('查询卡密列表失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
