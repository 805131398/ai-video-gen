# 卡密激活功能设计文档

**日期**: 2026-01-28
**状态**: 设计完成，待实施

## 一、功能概述

为 AI 视频生成平台添加卡密激活功能，支持用户通过激活码延长订阅时长。管理员可在后台生成和管理卡密。

## 二、核心决策

### 2.1 卡密类型
- **月卡（MONTHLY）**: 30天
- **季卡（QUARTERLY）**: 90天
- **年卡（YEARLY）**: 365天

### 2.2 生成方式
- 支持单个生成（手动指定类型）
- 支持批量生成（1-1000张，自动生成唯一码）

### 2.3 卡密格式
- 格式：`XXXX-XXXX-XXXX-XXXX`（16位，带分隔符）
- 字符集：去除易混淆字符（0/O、1/I 等）
- 示例：`A3K7-9PQR-2XYZ-4MNB`

### 2.4 激活规则
- **时间叠加**: 在现有订阅到期时间基础上累加
- **示例**: 当前订阅还剩10天，激活月卡后变成40天

### 2.5 有效期
- 卡密永久有效，无过期时间
- 管理员可手动删除未使用的卡密

### 2.6 权限控制
- 仅超级管理员（SUPER_ADMIN）可以生成和管理卡密

## 三、数据库设计

### 3.1 ActivationCode（卡密表）

```prisma
model ActivationCode {
  id          String   @id @default(cuid())
  code        String   @unique
  type        ActivationCodeType
  status      ActivationCodeStatus @default(UNUSED)

  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  usedAt      DateTime?

  createdBy   String
  creator     User     @relation("CreatedCodes", fields: [createdBy], references: [id])
  createdAt   DateTime @default(now())

  @@index([status])
  @@index([createdBy])
}

enum ActivationCodeType {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum ActivationCodeStatus {
  UNUSED
  USED
}
```

### 3.2 UserSubscription（用户订阅表）

```prisma
model UserSubscription {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])

  type        ActivationCodeType
  expiresAt   DateTime

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([expiresAt])
}
```

### 3.3 ActivationLog（激活日志表）

```prisma
model ActivationLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  codeId      String
  code        String
  type        ActivationCodeType

  beforeExpiry DateTime?
  afterExpiry  DateTime

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

## 四、API 接口设计

### 4.1 用户端 API

#### POST /api/activation/activate
激活卡密

**请求**:
```json
{
  "code": "XXXX-XXXX-XXXX-XXXX"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "type": "MONTHLY",
    "expiresAt": "2026-02-28T00:00:00Z",
    "daysAdded": 30
  }
}
```

**错误码**:
- `INVALID_CODE`: 卡密不存在
- `CODE_ALREADY_USED`: 卡密已被使用
- `UNAUTHORIZED`: 未登录

#### GET /api/activation/status
查询订阅状态

**响应**:
```json
{
  "success": true,
  "data": {
    "hasSubscription": true,
    "type": "MONTHLY",
    "expiresAt": "2026-02-28T00:00:00Z",
    "daysRemaining": 30,
    "isExpired": false
  }
}
```

#### GET /api/activation/history
查询激活历史

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "code": "XXXX-XXXX-XXXX-XXXX",
      "type": "MONTHLY",
      "activatedAt": "2026-01-28T00:00:00Z",
      "daysAdded": 30
    }
  ]
}
```

### 4.2 管理端 API

#### POST /api/admin/card-keys/generate
生成卡密

**请求**:
```json
{
  "type": "MONTHLY",
  "quantity": 100
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "codes": ["XXXX-XXXX-XXXX-XXXX", "..."],
    "count": 100
  }
}
```

**限制**:
- quantity: 1-1000
- 仅超级管理员可访问

#### GET /api/admin/card-keys
查询卡密列表

**查询参数**:
- `status`: UNUSED | USED | all
- `type`: MONTHLY | QUARTERLY | YEARLY | all
- `page`: 页码（从1开始）
- `pageSize`: 每页数量（默认20）

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "xxx",
        "code": "XXXX-XXXX-XXXX-XXXX",
        "type": "MONTHLY",
        "status": "UNUSED",
        "createdAt": "2026-01-28T00:00:00Z",
        "usedAt": null,
        "userId": null
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### DELETE /api/admin/card-keys/:id
删除单个卡密

**响应**:
```json
{
  "success": true,
  "message": "卡密已删除"
}
```

**限制**:
- 只能删除状态为 UNUSED 的卡密

#### DELETE /api/admin/card-keys/batch
批量删除卡密

**请求**:
```json
{
  "ids": ["xxx", "yyy", "zzz"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "deleted": 95,
    "failed": 5,
    "errors": [
      { "id": "xxx", "reason": "CODE_ALREADY_USED" }
    ]
  }
}
```

**限制**:
- 批量删除限制 1-1000 个 ID
- 只能删除 UNUSED 状态的卡密

## 五、业务逻辑层

### 5.1 ActivationService

位置：`web/src/lib/services/activation-service.ts`

**核心方法**:

1. `generateCode()`: 生成卡密码
   - 使用去除易混淆字符的字符集
   - 格式：XXXX-XXXX-XXXX-XXXX
   - 确保唯一性

2. `generateCodes(params)`: 批量生成卡密
   - 参数：type, quantity, createdBy
   - 返回：生成的卡密码数组

3. `activateCode(userId, code)`: 激活卡密
   - 验证卡密有效性
   - 计算新的到期时间（时间叠加）
   - 事务更新：卡密状态、用户订阅、激活日志

4. `deleteCodes(ids)`: 批量删除卡密
   - 逐个处理，返回详细结果
   - 只能删除 UNUSED 状态的卡密

**时间叠加逻辑**:
```typescript
const daysMap = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365
}

const baseDate = subscription && subscription.expiresAt > now
  ? subscription.expiresAt  // 在现有订阅基础上累加
  : now                     // 新订阅从现在开始

const newExpiresAt = new Date(baseDate)
newExpiresAt.setDate(newExpiresAt.getDate() + daysMap[type])
```

## 六、管理后台 UI

### 6.1 页面结构

位置：`web/src/app/admin/card-keys/page.tsx`

**功能模块**:

1. **统计卡片**（页面顶部）
   - 未使用卡密数量
   - 已使用卡密数量
   - 今日激活数量
   - 本月激活数量

2. **操作栏**
   - 生成卡密按钮
   - 批量删除按钮（选中后启用）
   - 筛选器：状态、类型

3. **卡密列表表格**
   - 列：复选框、卡密码、类型、状态、创建时间、使用时间、使用用户、操作
   - 操作：复制卡密、删除（仅未使用）
   - 分页：每页 20 条

4. **生成卡密对话框**
   - 单个生成模式：选择类型 → 生成
   - 批量生成模式：选择类型 + 输入数量 → 生成
   - 生成成功后显示卡密列表，支持一键复制全部

### 6.2 UI 组件

- `DataTable` - 表格（shadcn/ui）
- `Dialog` - 生成卡密对话框
- `Select` - 类型选择器
- `Input` - 数量输入
- `Button` - 操作按钮
- `Badge` - 状态标签
- `Card` - 统计卡片

### 6.3 权限检查

```typescript
const session = await auth()
if (session?.user?.role !== 'SUPER_ADMIN') {
  redirect('/admin')
}
```

### 6.4 关键交互

- 批量生成后，显示生成的卡密列表，支持导出为 CSV
- 删除操作需要二次确认
- 批量删除显示进度条
- 复制卡密后显示 Toast 提示

## 七、实施顺序

1. **数据库层**
   - 更新 `web/prisma/schema.prisma`
   - 运行 `pnpm db:generate` 和 `pnpm db:push`

2. **业务逻辑层**
   - 创建 `web/src/lib/services/activation-service.ts`

3. **用户端 API**
   - 创建 `web/src/app/api/activation/activate/route.ts`
   - 创建 `web/src/app/api/activation/status/route.ts`
   - 创建 `web/src/app/api/activation/history/route.ts`

4. **管理端 API**
   - 创建 `web/src/app/api/admin/card-keys/generate/route.ts`
   - 创建 `web/src/app/api/admin/card-keys/route.ts`
   - 创建 `web/src/app/api/admin/card-keys/[id]/route.ts`
   - 创建 `web/src/app/api/admin/card-keys/batch/route.ts`

5. **管理后台 UI**
   - 创建 `web/src/app/admin/card-keys/page.tsx`
   - 创建相关组件（生成对话框、统计卡片等）
   - 更新管理后台菜单

6. **测试**
   - 测试卡密生成（单个 + 批量）
   - 测试卡密激活（新订阅 + 时间叠加）
   - 测试卡密删除（单个 + 批量）
   - 测试权限控制

## 八、客户端集成

客户端（Electron）已实现：
- 激活页面 UI：`client/src/pages/Activate.tsx`
- API 调用层：`client/src/services/auth.ts`
- 本地数据库：`client/electron/database.ts`

**集成步骤**:
1. 确保客户端 API 调用指向正确的服务端地址
2. 测试完整的激活流程
3. 验证订阅状态同步

## 九、注意事项

### 9.1 安全性
- 卡密生成使用随机字符，确保唯一性
- 所有管理端 API 需要验证超级管理员权限
- 激活 API 需要验证用户登录状态
- 已使用的卡密不能删除（保留审计记录）

### 9.2 性能
- 批量生成限制在 1-1000 张，防止滥用
- 使用数据库索引优化查询（status, createdBy, expiresAt）
- 批量删除使用事务确保一致性

### 9.3 用户体验
- 卡密格式易读（带分隔符）
- 去除易混淆字符（0/O、1/I）
- 时间叠加避免用户损失已有订阅
- 提供详细的错误提示

## 十、后续优化

可选的功能增强（当前不实施）：
- 卡密导出为 CSV/Excel
- 卡密使用统计报表
- 卡密批次管理（记录每次生成的批次）
- 卡密备注功能（标记用途）
- 卡密有效期限制（可配置）
- 基于 RBAC 的权限控制（而非硬编码超级管理员）

---

**文档版本**: 1.0
**最后更新**: 2026-01-28
