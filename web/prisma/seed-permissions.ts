import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// 权限定义
const permissions = [
  // 角色管理
  {
    code: "role:view",
    name: "查看角色",
    description: "查看角色列表和详情",
    group: "role",
    sortOrder: 1,
  },
  {
    code: "role:create",
    name: "创建角色",
    description: "创建新角色",
    group: "role",
    sortOrder: 2,
  },
  {
    code: "role:edit",
    name: "编辑角色",
    description: "编辑角色信息和权限",
    group: "role",
    sortOrder: 3,
  },
  {
    code: "role:delete",
    name: "删除角色",
    description: "删除角色",
    group: "role",
    sortOrder: 4,
  },
  {
    code: "role:assign",
    name: "分配权限",
    description: "为角色分配权限",
    group: "role",
    sortOrder: 5,
  },

  // 用户管理
  {
    code: "user:view",
    name: "查看用户",
    description: "查看用户列表和详情",
    group: "user",
    sortOrder: 1,
  },
  {
    code: "user:create",
    name: "创建用户",
    description: "创建新用户",
    group: "user",
    sortOrder: 2,
  },
  {
    code: "user:edit",
    name: "编辑用户",
    description: "编辑用户信息",
    group: "user",
    sortOrder: 3,
  },
  {
    code: "user:delete",
    name: "删除用户",
    description: "删除用户",
    group: "user",
    sortOrder: 4,
  },
  {
    code: "user:role:assign",
    name: "分配角色",
    description: "为用户分配角色",
    group: "user",
    sortOrder: 5,
  },

  // 菜单管理
  {
    code: "menu:view",
    name: "查看菜单",
    description: "查看菜单列表",
    group: "menu",
    sortOrder: 1,
  },
  {
    code: "menu:create",
    name: "创建菜单",
    description: "创建新菜单",
    group: "menu",
    sortOrder: 2,
  },
  {
    code: "menu:edit",
    name: "编辑菜单",
    description: "编辑菜单信息",
    group: "menu",
    sortOrder: 3,
  },
  {
    code: "menu:delete",
    name: "删除菜单",
    description: "删除菜单",
    group: "menu",
    sortOrder: 4,
  },

  // 系统管理
  {
    code: "system:config",
    name: "系统配置",
    description: "管理系统配置",
    group: "system",
    sortOrder: 1,
  },

  // 操作日志
  {
    code: "log:view",
    name: "查看日志",
    description: "查看操作日志",
    group: "log",
    sortOrder: 1,
  },

  // 文件管理
  {
    code: "file:view",
    name: "查看文件",
    description: "查看文件列表",
    group: "file",
    sortOrder: 1,
  },
  {
    code: "file:upload",
    name: "上传文件",
    description: "上传文件",
    group: "file",
    sortOrder: 2,
  },
  {
    code: "file:delete",
    name: "删除文件",
    description: "删除文件",
    group: "file",
    sortOrder: 3,
  },
];

async function main() {
  console.log("开始初始化权限数据...");

  // 创建权限
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });
  }

  console.log(`已创建/更新 ${permissions.length} 个权限`);

  // 检查是否存在超级管理员角色
  let adminRole = await prisma.role.findFirst({
    where: { code: "super_admin" },
  });

  if (!adminRole) {
    // 需要先有一个用户才能创建角色
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      console.log("警告：没有用户，无法创建超级管理员角色");
      return;
    }

    const firstUser = users[0];

    // 创建超级管理员角色
    adminRole = await prisma.role.create({
      data: {
        name: "超级管理员",
        code: "super_admin",
        description: "拥有系统所有权限",
        isSystem: true,
        isActive: true,
        createdById: firstUser.id,
      },
    });

    console.log("已创建超级管理员角色");

    // 为超级管理员分配所有权限
    const allPermissions = await prisma.permission.findMany();
    await prisma.rolePermission.createMany({
      data: allPermissions.map((p) => ({
        roleId: adminRole!.id,
        permissionId: p.id,
      })),
    });

    console.log(`已为超级管理员分配 ${allPermissions.length} 个权限`);
  } else {
    console.log("超级管理员角色已存在");
  }

  console.log("权限数据初始化完成");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
