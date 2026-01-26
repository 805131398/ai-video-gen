"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface ConfigFilters {
  search?: string;
  groupCode?: string;
  env?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export async function getConfigs(filters: ConfigFilters = {}) {
  const { search, groupCode, env, isActive, page = 1, pageSize = 10 } = filters;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { configKey: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (groupCode && groupCode !== "all") {
    where.groupCode = groupCode;
  }

  if (env && env !== "all") {
    where.env = env;
  }

  if (isActive && isActive !== "all") {
    where.isActive = isActive === "true";
  }

  const [configs, total] = await Promise.all([
    prisma.systemConfig.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ groupCode: "asc" }, { configKey: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.systemConfig.count({ where }),
  ]);

  return {
    configs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getConfigGroups() {
  const groups = await prisma.systemConfig.findMany({
    select: { groupCode: true },
    distinct: ["groupCode"],
    orderBy: { groupCode: "asc" },
  });

  return groups.map((g) => g.groupCode);
}

export async function toggleConfigStatus(id: string, updatedById: string) {
  const config = await prisma.systemConfig.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!config) {
    throw new Error("配置不存在");
  }

  await prisma.systemConfig.update({
    where: { id },
    data: {
      isActive: !config.isActive,
      updatedById,
    },
  });

  revalidatePath("/admin/configs");
}
