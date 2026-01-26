"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permission";
import { PERMISSIONS } from "@/lib/permission-constants";

interface RoleFilters {
  search?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export async function getRoles(filters: RoleFilters = {}) {
  const { search, isActive, page = 1, pageSize = 10 } = filters;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive && isActive !== "all") {
    where.isActive = isActive === "true";
  }

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      include: {
        _count: {
          select: { menus: true, permissions: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.role.count({ where }),
  ]);

  return {
    roles,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function toggleRoleStatus(id: string, updatedById: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    select: { isActive: true, isSystem: true },
  });

  if (!role) {
    throw new Error("角色不存在");
  }

  if (role.isSystem) {
    throw new Error("系统角色不能修改状态");
  }

  await prisma.role.update({
    where: { id },
    data: {
      isActive: !role.isActive,
      updatedById,
    },
  });

  revalidatePath("/admin/roles");
}

// 获取所有权限（按分组）
export async function getAllPermissions() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  });

  // 按分组组织
  const grouped = permissions.reduce(
    (acc, perm) => {
      const group = perm.group || "other";
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(perm);
      return acc;
    },
    {} as Record<string, typeof permissions>
  );

  return grouped;
}

// 获取角色详情（包含权限）
export async function getRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });
}

// 创建角色
export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  permissionIds: string[];
}

export async function createRole(input: CreateRoleInput) {
  await requirePermission(PERMISSIONS.ROLE_CREATE);

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  // 检查 code 是否已存在
  const existing = await prisma.role.findFirst({
    where: { code: input.code },
  });

  if (existing) {
    throw new Error("角色编码已存在");
  }

  const role = await prisma.role.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      createdById: session.user.id,
      permissions: {
        create: input.permissionIds.map((permissionId) => ({
          permissionId,
        })),
      },
    },
  });

  revalidatePath("/admin/roles");
  return role;
}

// 更新角色
export interface UpdateRoleInput {
  id: string;
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export async function updateRole(input: UpdateRoleInput) {
  await requirePermission(PERMISSIONS.ROLE_EDIT);

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录");
  }

  const { id, permissionIds, ...data } = input;

  const role = await prisma.role.findUnique({
    where: { id },
    select: { isSystem: true },
  });

  if (!role) {
    throw new Error("角色不存在");
  }

  if (role.isSystem) {
    throw new Error("系统角色不能修改");
  }

  // 使用事务更新角色和权限
  await prisma.$transaction(async (tx) => {
    // 更新角色基本信息
    await tx.role.update({
      where: { id },
      data: {
        ...data,
        updatedById: session.user.id,
      },
    });

    // 如果提供了权限列表，更新权限关联
    if (permissionIds !== undefined) {
      // 删除现有权限关联
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // 创建新的权限关联
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    }
  });

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${id}`);
}

// 删除角色
export async function deleteRole(id: string) {
  await requirePermission(PERMISSIONS.ROLE_DELETE);

  const role = await prisma.role.findUnique({
    where: { id },
    select: { isSystem: true },
  });

  if (!role) {
    throw new Error("角色不存在");
  }

  if (role.isSystem) {
    throw new Error("系统角色不能删除");
  }

  // 检查是否有用户使用此角色
  const userCount = await prisma.userRole.count({
    where: { roleId: id },
  });

  if (userCount > 0) {
    throw new Error(`该角色已分配给 ${userCount} 个用户，无法删除`);
  }

  await prisma.role.delete({
    where: { id },
  });

  revalidatePath("/admin/roles");
}
