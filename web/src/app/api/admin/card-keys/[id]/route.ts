import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteCodes } from '@/lib/services/activation-service';
import { checkSuperAdmin } from '@/lib/permission';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const result = await deleteCodes([params.id]);

    if (result.deleted === 0) {
      const error = result.errors[0];
      if (error.reason === 'CODE_NOT_FOUND') {
        return NextResponse.json({ error: '卡密不存在' }, { status: 404 });
      }
      if (error.reason === 'CODE_ALREADY_USED') {
        return NextResponse.json({ error: '已使用的卡密不能删除' }, { status: 400 });
      }
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '卡密已删除',
    });
  } catch (error) {
    console.error('删除卡密失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
