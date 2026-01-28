"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { StorageProviderType } from "@/lib/storage/types";

interface StorageProviderFilters {
  search?: string;
  providerCode?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export async function getStorageProviders(filters: StorageProviderFilters = {}) {
  const { search, providerCode, isActive, page = 1, pageSize = 10 } = filters;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { providerName: { contains: search, mode: "insensitive" } },
      { providerCode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (providerCode && providerCode !== "all") {
    where.providerCode = providerCode;
  }

  if (isActive && isActive !== "all") {
    where.isActive = isActive === "true";
  }

  const [providers, total] = await Promise.all([
    prisma.storageProvider.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.storageProvider.count({ where }),
  ]);

  return {
    providers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProviderCodes() {
  const codes = await prisma.storageProvider.findMany({
    select: { providerCode: true },
    distinct: ["providerCode"],
    orderBy: { providerCode: "asc" },
  });

  return codes.map((c) => c.providerCode);
}

export async function toggleProviderStatus(id: string, updatedById: string) {
  const provider = await prisma.storageProvider.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!provider) {
    throw new Error("存储提供商不存在");
  }

  await prisma.storageProvider.update({
    where: { id },
    data: {
      isActive: !provider.isActive,
      updatedById,
    },
  });

  revalidatePath("/admin/storage-providers");
}

export async function setDefaultProvider(id: string, updatedById: string) {
  const provider = await prisma.storageProvider.findUnique({
    where: { id },
    select: { tenantId: true },
  });

  if (!provider) {
    throw new Error("存储提供商不存在");
  }

  // 使用事务确保只有一个默认提供商
  await prisma.$transaction([
    // 取消当前租户的所有默认提供商
    prisma.storageProvider.updateMany({
      where: {
        tenantId: provider.tenantId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    }),
    // 设置新的默认提供商
    prisma.storageProvider.update({
      where: { id },
      data: {
        isDefault: true,
        updatedById,
      },
    }),
  ]);

  revalidatePath("/admin/storage-providers");
}

interface CreateStorageProviderData {
  providerCode: StorageProviderType;
  providerName: string;
  config: Record<string, unknown>;
  isDefault?: boolean;
  isActive?: boolean;
  tenantId?: string;
  createdById: string;
}

export async function createStorageProvider(data: CreateStorageProviderData) {
  const { providerCode, providerName, config, isDefault = false, isActive = true, tenantId, createdById } = data;

  // 如果设置为默认，先取消其他默认提供商
  if (isDefault) {
    await prisma.storageProvider.updateMany({
      where: {
        tenantId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  const provider = await prisma.storageProvider.create({
    data: {
      providerCode,
      providerName,
      config,
      isDefault,
      isActive,
      tenantId,
      createdById,
    },
  });

  revalidatePath("/admin/storage-providers");
  return provider;
}

interface UpdateStorageProviderData {
  id: string;
  providerName?: string;
  config?: Record<string, unknown>;
  isDefault?: boolean;
  isActive?: boolean;
  updatedById: string;
}

export async function updateStorageProvider(data: UpdateStorageProviderData) {
  const { id, providerName, config, isDefault, isActive, updatedById } = data;

  const provider = await prisma.storageProvider.findUnique({
    where: { id },
    select: { tenantId: true },
  });

  if (!provider) {
    throw new Error("存储提供商不存在");
  }

  // 如果设置为默认，先取消其他默认提供商
  if (isDefault) {
    await prisma.storageProvider.updateMany({
      where: {
        tenantId: provider.tenantId,
        isDefault: true,
        id: { not: id },
      },
      data: {
        isDefault: false,
      },
    });
  }

  const updated = await prisma.storageProvider.update({
    where: { id },
    data: {
      ...(providerName && { providerName }),
      ...(config && { config }),
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
      updatedById,
    },
  });

  revalidatePath("/admin/storage-providers");
  return updated;
}

export async function deleteStorageProvider(id: string) {
  const provider = await prisma.storageProvider.findUnique({
    where: { id },
    select: { isDefault: true },
  });

  if (!provider) {
    throw new Error("存储提供商不存在");
  }

  if (provider.isDefault) {
    throw new Error("无法删除默认存储提供商，请先设置其他提供商为默认");
  }

  await prisma.storageProvider.delete({
    where: { id },
  });

  revalidatePath("/admin/storage-providers");
}
