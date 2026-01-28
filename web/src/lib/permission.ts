"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cache } from "react";
import { PermissionCode } from "./permission-constants";

// 缓存用户权限查询（同一请求内复用）
export const getUserPermissions = cache(
  async (userId: string): Promise<string[]> => {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();

    for (const userRole of userRoles) {
      if (userRole.role.isActive) {
        for (const rp of userRole.role.permissions) {
          permissions.add(rp.permission.code);
        }
      }
    }

    return Array.from(permissions);
  }
);

// 检查当前用户是否有指定权限
export async function hasPermission(
  permissionCode: PermissionCode
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const permissions = await getUserPermissions(session.user.id);
  return permissions.includes(permissionCode);
}

// 检查当前用户是否有任一权限
export async function hasAnyPermission(
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const permissions = await getUserPermissions(session.user.id);
  return permissionCodes.some((code) => permissions.includes(code));
}

// 检查当前用户是否有所有权限
export async function hasAllPermissions(
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const permissions = await getUserPermissions(session.user.id);
  return permissionCodes.every((code) => permissions.includes(code));
}

// 权限检查装饰器（用于 Server Action）
export async function requirePermission(
  permissionCode: PermissionCode
): Promise<void> {
  const hasAccess = await hasPermission(permissionCode);
  if (!hasAccess) {
    throw new Error("权限不足，无法执行此操作");
  }
}

// 获取当前用户信息（包含权限）
export async function getCurrentUserWithPermissions() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const permissions = await getUserPermissions(session.user.id);

  return {
    ...session.user,
    permissions,
  };
}

// 检查用户是否为超级管理员
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: true,
    },
  });

  return userRoles.some(
    (userRole) => userRole.role.code === "super_admin" && userRole.role.isActive
  );
}

// 检查当前用户是否为超级管理员
export async function checkSuperAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  return isSuperAdmin(session.user.id);
}
