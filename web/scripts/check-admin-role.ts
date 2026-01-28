import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function checkAdminRole() {
  console.log('=== 检查超级管理员角色配置 ===\n');

  // 1. 检查是否有 super_admin 角色
  const superAdminRole = await prisma.role.findFirst({
    where: { code: 'super_admin' },
  });

  console.log('1. super_admin 角色:', superAdminRole ? '✅ 存在' : '❌ 不存在');
  if (superAdminRole) {
    console.log('   - ID:', superAdminRole.id);
    console.log('   - 名称:', superAdminRole.name);
    console.log('   - 状态:', superAdminRole.isActive ? '激活' : '未激活');
  }

  // 2. 检查所有角色
  const allRoles = await prisma.role.findMany({
    select: { id: true, code: true, name: true, isActive: true },
  });
  console.log('\n2. 所有角色:');
  allRoles.forEach(role => {
    console.log(`   - ${role.code} (${role.name}) - ${role.isActive ? '激活' : '未激活'}`);
  });

  // 3. 检查所有用户及其角色
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  console.log('\n3. 用户及其角色:');
  users.forEach(user => {
    console.log(`   - ${user.name} (${user.phone})`);
    if (user.roles.length === 0) {
      console.log('     ⚠️  未分配任何角色');
    } else {
      user.roles.forEach(ur => {
        console.log(`     - ${ur.role.code} (${ur.role.name})`);
      });
    }
  });

  await prisma.$disconnect();
}

checkAdminRole().catch(console.error);
