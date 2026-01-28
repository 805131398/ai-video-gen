import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkSuperAdmin, isSuperAdmin } from '@/lib/permission';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({
        error: '未登录',
        session: null
      }, { status: 401 });
    }

    // 检查用户角色
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.user.id },
      include: {
        role: true,
      },
    });

    // 检查是否为超级管理员
    const isSuperAdminResult = await isSuperAdmin(session.user.id);
    const checkSuperAdminResult = await checkSuperAdmin();

    // 检查所有角色
    const allRoles = await prisma.role.findMany({
      select: { id: true, code: true, name: true, isActive: true },
    });

    return NextResponse.json({
      session: {
        user: session.user,
      },
      userRoles: userRoles.map(ur => ({
        roleId: ur.roleId,
        roleCode: ur.role.code,
        roleName: ur.role.name,
        isActive: ur.role.isActive,
      })),
      isSuperAdmin: isSuperAdminResult,
      checkSuperAdmin: checkSuperAdminResult,
      allRoles: allRoles,
      hasSuperAdminRole: allRoles.some(r => r.code === 'super_admin'),
    });
  } catch (error) {
    console.error('检查用户角色失败:', error);
    return NextResponse.json({
      error: '检查失败',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
