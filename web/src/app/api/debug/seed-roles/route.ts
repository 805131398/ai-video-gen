import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 开始初始化角色数据...');

    // 获取第一个用户作为创建者
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      return NextResponse.json({
        error: '数据库中没有用户，请先创建用户'
      }, { status: 400 });
    }

    console.log(`✅ 找到用户: ${firstUser.name} (${firstUser.phone})`);

    // 1. 创建超级管理员角色
    const superAdminRole = await prisma.role.upsert({
      where: {
        tenantId_code: {
          tenantId: firstUser.tenantId || '',
          code: 'super_admin',
        },
      },
      update: {},
      create: {
        name: '超级管理员',
        code: 'super_admin',
        description: '系统超级管理员，拥有所有权限',
        isSystem: true,
        isActive: true,
        tenantId: firstUser.tenantId,
        createdById: firstUser.id,
      },
    });

    console.log(`✅ 创建/更新角色: ${superAdminRole.name}`);

    // 2. 创建普通管理员角色
    const adminRole = await prisma.role.upsert({
      where: {
        tenantId_code: {
          tenantId: firstUser.tenantId || '',
          code: 'admin',
        },
      },
      update: {},
      create: {
        name: '管理员',
        code: 'admin',
        description: '系统管理员，拥有大部分权限',
        isSystem: true,
        isActive: true,
        tenantId: firstUser.tenantId,
        createdById: firstUser.id,
      },
    });

    console.log(`✅ 创建/更新角色: ${adminRole.name}`);

    // 3. 创建普通用户角色
    const userRole = await prisma.role.upsert({
      where: {
        tenantId_code: {
          tenantId: firstUser.tenantId || '',
          code: 'user',
        },
      },
      update: {},
      create: {
        name: '普通用户',
        code: 'user',
        description: '普通用户，拥有基础权限',
        isSystem: true,
        isActive: true,
        tenantId: firstUser.tenantId,
        createdById: firstUser.id,
      },
    });

    console.log(`✅ 创建/更新角色: ${userRole.name}`);

    // 4. 给第一个用户分配超级管理员角色
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: firstUser.id,
          roleId: superAdminRole.id,
        },
      },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: {
          userId: firstUser.id,
          roleId: superAdminRole.id,
        },
      });
      console.log(`✅ 分配角色: ${firstUser.name} -> ${superAdminRole.name}`);
    } else {
      console.log(`ℹ️  用户已有角色: ${firstUser.name} -> ${superAdminRole.name}`);
    }

    // 获取最终结果
    const roles = await prisma.role.findMany({
      select: { code: true, name: true, isActive: true },
    });

    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '角色初始化完成',
      data: {
        roles: roles,
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          phone: user.phone,
          roles: user.roles.map(ur => ({
            code: ur.role.code,
            name: ur.role.name,
          })),
        })),
      },
    });
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    return NextResponse.json({
      error: '初始化失败',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
