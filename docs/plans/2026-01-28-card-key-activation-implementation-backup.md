# 卡密激活功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标**: 为 AI 视频生成平台添加完整的卡密激活功能，包括数据库模型、业务逻辑、API 接口和管理后台 UI。

**架构**: 采用分层架构 - Prisma 数据层 → Service 业务逻辑层 → API 路由层 → UI 展示层。使用事务确保数据一致性，采用时间叠加策略处理订阅延期。

**技术栈**: Next.js 16 App Router, Prisma 7, TypeScript, shadcn/ui, NextAuth.js 5

---

## Task 1: 数据库模型设计

**文件**:
- Modify: `web/prisma/schema.prisma`

**Step 1: 添加卡密相关枚举类型**

在 schema.prisma 的枚举定义区域（约第 100 行之后）添加:

```prisma
// 卡密类型
enum ActivationCodeType {
  MONTHLY    // 月卡 (30天)
  QUARTERLY  // 季卡 (90天)
  YEARLY     // 年卡 (365天)
}

// 卡密状态
enum ActivationCodeStatus {
  UNUSED  // 未使用
  USED    // 已使用
}
```

**Step 2: 添加 ActivationCode 模型**

在 schema.prisma 的模型定义区域末尾添加:

```prisma
// 卡密表
model ActivationCode {
  id          String                 @id @default(cuid())
  code        String                 @unique
  type        ActivationCodeType
  status      ActivationCodeStatus   @default(UNUSED)

  userId      String?
  user        User?                  @relation("UsedCodes", fields: [userId], references: [id])
  usedAt      DateTime?

  createdBy   String
  creator     User                   @relation("CreatedCodes", fields: [createdBy], references: [id])
  createdAt   DateTime               @default(now())

  @@index([status])
  @@index([createdBy])
  @@index([createdAt])
  @@map("activation_codes")
}
```

**Step 3: 添加 UserSubscription 模型**

```prisma
// 用户订阅表
model UserSubscription {
  id          String               @id @default(cuid())
  userId      String               @unique
  user        User                 @relation(fields: [userId], references: [id])

  type        ActivationCodeType
  expiresAt   DateTime

  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  @@index([expiresAt])
  @@map("user_subscriptions")
}
```

**Step 4: 添加 ActivationLog 模型**

```prisma
// 激活日志表
model ActivationLog {
  id            String               @id @default(cuid())
  userId        String
  user          User                 @relation(fields: [userId], references: [id])

  codeId        String
  code          String
  type          ActivationCodeType

  beforeExpiry  DateTime?
  afterExpiry   DateTime

  createdAt     DateTime             @default(now())

  @@index([userId])
  @@index([createdAt])
  @@map("activation_logs")
}
```

**Step 5: 更新 User 模型关联**

找到 User 模型定义，在其中添加关联字段:

```prisma
model User {
  // ... 现有字段 ...

  // 卡密相关关联
  createdCodes      ActivationCode[]   @relation("CreatedCodes")
  usedCodes         ActivationCode[]   @relation("UsedCodes")
  subscription      UserSubscription?
  activationLogs    ActivationLog[]

  // ... 其他字段 ...
}
```

**Step 6: 生成 Prisma 客户端**

运行命令:
```bash
cd web && pnpm db:generate
```

预期输出: "Generated Prisma Client to ./src/generated/prisma"

**Step 7: 推送数据库变更**

运行命令:
```bash
cd web && pnpm db:push
```

预期输出: "Your database is now in sync with your Prisma schema"

**Step 8: 提交数据库变更**

```bash
git add web/prisma/schema.prisma web/src/generated/prisma
git commit -m "feat(db): 添加卡密激活相关数据模型

- 添加 ActivationCode, UserSubscription, ActivationLog 模型
- 添加 ActivationCodeType 和 ActivationCodeStatus 枚举
- 更新 User 模型关联关系"
```

---

## Task 2: 业务逻辑层 - ActivationService

**文件**:
- Create: `web/src/lib/services/activation-service.ts`

**Step 1: 创建服务文件基础结构**

```typescript
import { prisma } from '@/lib/prisma';
import { ActivationCodeType, ActivationCodeStatus } from '@/generated/prisma/enums';

// 卡密类型对应天数
const DAYS_MAP: Record<ActivationCodeType, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

// 去除易混淆字符的字符集
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
```

**Step 2: 实现卡密生成函数**

```typescript
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
```

**Step 3: 实现批量生成卡密**

```typescript
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
```

**Step 4: 实现卡密激活功能**

```typescript
export interface ActivateCodeResult {
  type: ActivationCodeType;
  expiresAt: Date;
  daysAdded: number;
}

/**
 * 激活卡密
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
      ? subscription.expiresAt
      : now;

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
```

**Step 5: 实现订阅状态查询**

```typescript
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
```

**Step 6: 实现激活历史查询**

```typescript
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
```

**Step 7: 实现卡密删除功能**

```typescript
export interface DeleteCodesResult {
  deleted: number;
  failed: number;
  errors: Array<{ id: string; reason: string }>;
}

/**
 * 批量删除卡密
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
```

**Step 8: 提交业务逻辑层代码**

```bash
git add web/src/lib/services/activation-service.ts
git commit -m "feat(service): 实现卡密激活业务逻辑

- 实现卡密生成（单个/批量）
- 实现卡密激活（时间叠加策略）
- 实现订阅状态查询
- 实现激活历史查询
- 实现卡密删除功能"
```

---

