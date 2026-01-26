"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface MenuFilters {
  search?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export async function getMenus(filters: MenuFilters = {}) {
  const { search, isActive, page = 1, pageSize = 10 } = filters;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { label: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive && isActive !== "all") {
    where.isActive = isActive === "true";
  }

  const [menus, total] = await Promise.all([
    prisma.menu.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true, label: true },
        },
        _count: {
          select: { children: true, roles: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.menu.count({ where }),
  ]);

  return {
    menus,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getMenuTree() {
  const menus = await prisma.menu.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      label: true,
      parentId: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return menus;
}

export async function toggleMenuStatus(id: string, updatedById: string) {
  const menu = await prisma.menu.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!menu) {
    throw new Error("菜单不存在");
  }

  await prisma.menu.update({
    where: { id },
    data: {
      isActive: !menu.isActive,
      updatedById,
    },
  });

  revalidatePath("/admin/menus");
}
