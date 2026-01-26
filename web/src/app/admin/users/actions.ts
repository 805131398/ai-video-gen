"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permission";
import { PERMISSIONS } from "@/lib/permission-constants";

interface UserFilters {
  search?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export async function getUsers(filters: UserFilters = {}) {
  const { search, isActive, page = 1, pageSize = 10 } = filters;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  if (isActive && isActive !== "all") {
    where.isActive = isActive === "true";
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        roles: {
          include: {
            role: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function toggleUserStatus(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/admin/users");
}

// 获取所有可用角色
export async function getAllRoles() {
  return prisma.role.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true, description: true },
    orderBy: { name: "asc" },
  });
}

// 获取用户的角色
export async function getUserRoles(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  return userRoles.map((ur) => ur.role);
}

// 为用户分配角色
export async function assignRolesToUser(userId: string, roleIds: string[]) {
  await requirePermission(PERMISSIONS.USER_ROLE_ASSIGN);

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  // 使用事务更新用户角色
  await prisma.$transaction(async (tx) => {
    // 删除现有角色关联
    await tx.userRole.deleteMany({
      where: { userId },
    });

    // 创建新的角色关联
    if (roleIds.length > 0) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({
          userId,
          roleId,
        })),
      });
    }
  });

  revalidatePath("/admin/users");
}
