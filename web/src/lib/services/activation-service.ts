import { prisma } from '@/lib/prisma';
import { ActivationCodeType, ActivationCodeStatus } from '@/generated/prisma/enums';

// 卡密类型对应天数
const DAYS_MAP: Record<ActivationCodeType, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

// 去除易混淆字符的字符集 (去除 0/O、1/I/L 等)
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 生成单个卡密码
 * 格式: XXXX-XXXX-XXXX-XXXX
 */
function generateCode(): string {
  const segments: string[] = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const randomIndex = Math.floor(Math.random() * CHARSET.length);
      segment += CHARSET[randomIndex];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

/**
 * 生成唯一卡密码（检查数据库唯一性）
 */
async function generateUniqueCode(): Promise<string> {
  let code: string;
  let exists: boolean;
  do {
    code = generateCode();
    const existing = await prisma.activationCode.findUnique({
      where: { code },
    });
    exists = !!existing;
  } while (exists);
  return code;
}

export interface GenerateCodesParams {
  type: ActivationCodeType;
  quantity: number;
  createdBy: string;
}

export interface GenerateCodesResult {
  codes: string[];
  count: number;
}

/**
 * 批量生成卡密
 */
export async function generateCodes(
  params: GenerateCodesParams
): Promise<GenerateCodesResult> {
  const { type, quantity, createdBy } = params;

  // 验证数量范围
  if (quantity < 1 || quantity > 1000) {
    throw new Error('生成数量必须在 1-1000 之间');
  }

  const codes: string[] = [];

  // 生成唯一卡密
  for (let i = 0; i < quantity; i++) {
    const code = await generateUniqueCode();
    codes.push(code);
  }

  // 批量插入数据库
  await prisma.activationCode.createMany({
    data: codes.map(code => ({
      code,
      type,
      createdBy,
    })),
  });

  return {
    codes,
    count: codes.length,
  };
}

export interface ActivateCodeResult {
  type: ActivationCodeType;
  expiresAt: Date;
  daysAdded: number;
}

/**
 * 激活卡密
 * 使用事务确保数据一致性
 * 实现时间叠加策略
 */
export async function activateCode(
  userId: string,
  code: string
): Promise<ActivateCodeResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. 查询卡密
    const activationCode = await tx.activationCode.findUnique({
      where: { code },
    });

    if (!activationCode) {
      throw new Error('INVALID_CODE');
    }

    if (activationCode.status === ActivationCodeStatus.USED) {
      throw new Error('CODE_ALREADY_USED');
    }

    // 2. 查询用户当前订阅
    const subscription = await tx.userSubscription.findUnique({
      where: { userId },
    });

    // 3. 计算新的到期时间（时间叠加）
    const now = new Date();
    const baseDate = subscription && subscription.expiresAt > now
      ? subscription.expiresAt  // 在现有订阅基础上累加
      : now;                     // 新订阅从现在开始

    const daysToAdd = DAYS_MAP[activationCode.type];
    const newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

    // 4. 更新或创建订阅
    await tx.userSubscription.upsert({
      where: { userId },
      create: {
        userId,
        type: activationCode.type,
        expiresAt: newExpiresAt,
      },
      update: {
        type: activationCode.type,
        expiresAt: newExpiresAt,
      },
    });

    // 5. 更新卡密状态
    await tx.activationCode.update({
      where: { id: activationCode.id },
      data: {
        status: ActivationCodeStatus.USED,
        userId,
        usedAt: now,
      },
    });

    // 6. 记录激活日志
    await tx.activationLog.create({
      data: {
        userId,
        codeId: activationCode.id,
        code: activationCode.code,
        type: activationCode.type,
        beforeExpiry: subscription?.expiresAt,
        afterExpiry: newExpiresAt,
      },
    });

    return {
      type: activationCode.type,
      expiresAt: newExpiresAt,
      daysAdded: daysToAdd,
    };
  });
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  type?: ActivationCodeType;
  expiresAt?: Date;
  daysRemaining?: number;
  isExpired: boolean;
}

/**
 * 查询用户订阅状态
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      hasSubscription: false,
      isExpired: true,
    };
  }

  const now = new Date();
  const isExpired = subscription.expiresAt <= now;
  const daysRemaining = isExpired
    ? 0
    : Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    hasSubscription: true,
    type: subscription.type,
    expiresAt: subscription.expiresAt,
    daysRemaining,
    isExpired,
  };
}

export interface ActivationHistory {
  id: string;
  code: string;
  type: ActivationCodeType;
  activatedAt: Date;
  daysAdded: number;
}

/**
 * 查询用户激活历史
 */
export async function getActivationHistory(
  userId: string
): Promise<ActivationHistory[]> {
  const logs = await prisma.activationLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return logs.map(log => ({
    id: log.id,
    code: log.code,
    type: log.type,
    activatedAt: log.createdAt,
    daysAdded: DAYS_MAP[log.type],
  }));
}

export interface DeleteCodesResult {
  deleted: number;
  failed: number;
  errors: Array<{ id: string; reason: string }>;
}

/**
 * 批量删除卡密
 * 只能删除未使用的卡密
 */
export async function deleteCodes(ids: string[]): Promise<DeleteCodesResult> {
  if (ids.length < 1 || ids.length > 1000) {
    throw new Error('删除数量必须在 1-1000 之间');
  }

  const result: DeleteCodesResult = {
    deleted: 0,
    failed: 0,
    errors: [],
  };

  for (const id of ids) {
    try {
      const code = await prisma.activationCode.findUnique({
        where: { id },
      });

      if (!code) {
        result.failed++;
        result.errors.push({ id, reason: 'CODE_NOT_FOUND' });
        continue;
      }

      if (code.status === ActivationCodeStatus.USED) {
        result.failed++;
        result.errors.push({ id, reason: 'CODE_ALREADY_USED' });
        continue;
      }

      await prisma.activationCode.delete({
        where: { id },
      });

      result.deleted++;
    } catch (error) {
      result.failed++;
      result.errors.push({ id, reason: 'DELETE_FAILED' });
    }
  }

  return result;
}
