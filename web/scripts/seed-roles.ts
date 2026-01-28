import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function seedRoles() {
  console.log('🌱 开始初始化角色数据...\n');

  // 获取第一个用户作为创建者
  const firstUser = await prisma.user.findFirst();
  if (!firstUser) {
    console.error('❌ 错误：数据库中没有用户，请先创建用户');
    return;
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

  console.log(`✅ 创建/更新角色: ${superAdminRole.name} (${superAdminRole.code})`);

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

  console.log(`✅ 创建/更新角色: ${adminRole.name} (${adminRole.code})`);

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

  console.log(`✅ 创建/更新角色: ${userRole.name} (${userRole.code})`);

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

  console.log('\n🎉 角色初始化完成！');
  console.log('\n当前角色列表:');
  const roles = await prisma.role.findMany({
    select: { code: true, name: true, isActive: true },
  });
  roles.forEach(role => {
    console.log(`  - ${role.code}: ${role.name} (${role.isActive ? '激活' : '未激活'})`);
  });

  console.log('\n用户角色分配:');
  const users = await prisma.user.findMany({
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.phone}):`);
    user.roles.forEach(ur => {
      console.log(`    → ${ur.role.name} (${ur.role.code})`);
    });
  });
}

seedRoles()
  .catch((error) => {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
