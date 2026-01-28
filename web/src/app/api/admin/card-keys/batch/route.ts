import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteCodes } from '@/lib/services/activation-service';
import { checkSuperAdmin } from '@/lib/permission';

export async function DELETE(request: NextRequest) {
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
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 1000) {
      return NextResponse.json({ error: '删除数量必须在 1-1000 之间' }, { status: 400 });
    }

    const result = await deleteCodes(ids);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('批量删除卡密失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
