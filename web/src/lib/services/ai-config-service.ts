import { prisma } from "@/lib/prisma";
import { AIModelType } from "@/generated/prisma";

export interface AIConfigInput {
  tenantId?: string;
  userId?: string;
  modelType: AIModelType;
  providerName: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: Record<string, unknown>;
  isDefault?: boolean;
  isActive?: boolean;
  priority?: number;
}

/**
 * 获取有效的 AI 配置
 * 优先级: 用户配置 > 租户配置 > 系统配置
 */
export async function getEffectiveAIConfig(
  modelType: AIModelType,
  userId?: string,
  tenantId?: string
) {
  // 1. 先查用户级配置
  if (userId) {
    const userConfig = await prisma.aIModelConfig.findFirst({
      where: {
        userId,
        modelType,
        isActive: true,
      },
      orderBy: { priority: "desc" },
    });
    if (userConfig) return userConfig;
  }

  // 2. 再查租户级配置
  if (tenantId) {
    const tenantConfig = await prisma.aIModelConfig.findFirst({
      where: {
        tenantId,
        userId: null,
        modelType,
        isActive: true,
      },
      orderBy: { priority: "desc" },
    });
    if (tenantConfig) return tenantConfig;
  }

  // 3. 最后查系统级配置
  const systemConfig = await prisma.aIModelConfig.findFirst({
    where: {
      tenantId: null,
      userId: null,
      modelType,
      isActive: true,
      isDefault: true,
    },
    orderBy: { priority: "desc" },
  });

  return systemConfig;
}

/**
 * 获取 AI 配置列表
 */
export async function getAIConfigs(params: {
  tenantId?: string;
  userId?: string;
  modelType?: AIModelType;
  isActive?: boolean;
}) {
  const { tenantId, userId, modelType, isActive } = params;

  return prisma.aIModelConfig.findMany({
    where: {
      ...(tenantId !== undefined && { tenantId }),
      ...(userId !== undefined && { userId }),
      ...(modelType && { modelType }),
      ...(isActive !== undefined && { isActive }),
    },
    orderBy: [{ modelType: "asc" }, { priority: "desc" }],
  });
}

/**
 * 创建 AI 配置
 */
export async function createAIConfig(data: AIConfigInput) {
  return prisma.aIModelConfig.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      modelType: data.modelType,
      providerName: data.providerName,
      apiUrl: data.apiUrl,
      apiKey: data.apiKey,
      modelName: data.modelName,
      config: data.config,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true,
      priority: data.priority ?? 0,
    },
  });
}

/**
 * 更新 AI 配置
 */
export async function updateAIConfig(
  id: string,
  data: Partial<AIConfigInput>
) {
  return prisma.aIModelConfig.update({
    where: { id },
    data: {
      ...(data.providerName && { providerName: data.providerName }),
      ...(data.apiUrl && { apiUrl: data.apiUrl }),
      ...(data.apiKey && { apiKey: data.apiKey }),
      ...(data.modelName && { modelName: data.modelName }),
      ...(data.config !== undefined && { config: data.config }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.priority !== undefined && { priority: data.priority }),
    },
  });
}

/**
 * 删除 AI 配置
 */
export async function deleteAIConfig(id: string) {
  return prisma.aIModelConfig.delete({
    where: { id },
  });
}

/**
 * 获取单个 AI 配置
 */
export async function getAIConfigById(id: string) {
  return prisma.aIModelConfig.findUnique({
    where: { id },
  });
}

/**
 * 设置默认配置
 */
export async function setDefaultAIConfig(
  id: string,
  modelType: AIModelType,
  tenantId?: string
) {
  // 先取消同类型的其他默认配置
  await prisma.aIModelConfig.updateMany({
    where: {
      modelType,
      tenantId: tenantId ?? null,
      userId: null,
      isDefault: true,
    },
    data: { isDefault: false },
  });

  // 设置新的默认配置
  return prisma.aIModelConfig.update({
    where: { id },
    data: { isDefault: true },
  });
}
