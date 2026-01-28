# 卡密激活功能实施计划 - 精简版

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标**: 为 AI 视频生成平台添加完整的卡密激活功能

**架构**: Prisma 数据层 → Service 业务逻辑层 → API 路由层 → UI 展示层

**技术栈**: Next.js 16, Prisma 7, TypeScript, shadcn/ui, NextAuth.js 5

**详细设计文档**: `docs/plans/2026-01-28-card-key-activation-design.md`

---

## 实施顺序

### Task 1: 数据库模型 (web/prisma/schema.prisma)

1. 添加枚举: `ActivationCodeType`, `ActivationCodeStatus`
2. 添加模型: `ActivationCode`, `UserSubscription`, `ActivationLog`
3. 更新 `User` 模型关联
4. 运行: `pnpm db:generate && pnpm db:push`
5. 提交: "feat(db): 添加卡密激活相关数据模型"

### Task 2: 业务逻辑层 (web/src/lib/services/activation-service.ts)

实现以下函数:
- `generateCodes()` - 批量生成卡密
- `activateCode()` - 激活卡密（时间叠加策略）
- `getSubscriptionStatus()` - 查询订阅状态
- `getActivationHistory()` - 查询激活历史
- `deleteCodes()` - 批量删除卡密

提交: "feat(service): 实现卡密激活业务逻辑"

### Task 3: 用户端 API (web/src/app/api/activation/)

创建以下路由:
- `activate/route.ts` - POST 激活卡密
- `status/route.ts` - GET 查询订阅状态
- `history/route.ts` - GET 查询激活历史

提交: "feat(api): 实现用户端激活 API"

### Task 4: 管理端 API (web/src/app/api/admin/card-keys/)

创建以下路由:
- `generate/route.ts` - POST 生成卡密（超级管理员）
- `route.ts` - GET 查询卡密列表（分页、筛选）
- `[id]/route.ts` - DELETE 删除单个卡密
- `batch/route.ts` - DELETE 批量删除卡密

提交: "feat(api): 实现管理端卡密管理 API"

### Task 5: 管理后台 UI (web/src/app/admin/card-keys/)

**页面结构** (`page.tsx`):
1. 统计卡片（未使用/已使用/今日激活/本月激活）
2. 操作栏（生成按钮、批量删除、筛选器）
3. 卡密列表表格（DataTable + 分页）
4. 生成卡密对话框（Dialog）

**组件** (`components/`):
- `GenerateDialog.tsx` - 生成卡密对话框
- `StatsCards.tsx` - 统计卡片
- `CardKeysTable.tsx` - 卡密列表表格

**权限检查**:
```typescript
const session = await auth();
if (session?.user?.role !== 'SUPER_ADMIN') {
  redirect('/admin');
}
```

提交: "feat(admin): 实现卡密管理后台 UI"

### Task 6: 更新管理后台菜单

修改 `web/src/app/admin/layout.tsx` 或相关菜单配置文件，添加:

```typescript
{
  title: '卡密管理',
  href: '/admin/card-keys',
  icon: 'Key', // 或其他合适的图标
  roles: ['SUPER_ADMIN'],
}
```

提交: "feat(admin): 添加卡密管理菜单项"

---

## 测试清单

### 功能测试
- [ ] 生成单个卡密
- [ ] 批量生成卡密（1-1000张）
- [ ] 激活卡密（新订阅）
- [ ] 激活卡密（时间叠加）
- [ ] 查询订阅状态
- [ ] 查询激活历史
- [ ] 删除未使用卡密
- [ ] 尝试删除已使用卡密（应失败）
- [ ] 批量删除卡密

### 权限测试
- [ ] 非超级管理员访问管理页面（应拒绝）
- [ ] 非超级管理员调用管理 API（应返回 403）
- [ ] 未登录用户激活卡密（应返回 401）

### 边界测试
- [ ] 激活不存在的卡密
- [ ] 激活已使用的卡密
- [ ] 生成超过 1000 张卡密
- [ ] 删除超过 1000 个卡密

---

## 关键代码片段

### 时间叠加逻辑
```typescript
const DAYS_MAP = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365 };
const now = new Date();
const baseDate = subscription && subscription.expiresAt > now
  ? subscription.expiresAt  // 在现有订阅基础上累加
  : now;                     // 新订阅从现在开始
const newExpiresAt = new Date(baseDate);
newExpiresAt.setDate(newExpiresAt.getDate() + DAYS_MAP[type]);
```

### 卡密生成
```typescript
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
function generateCode(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    segments.push(segment);
  }
  return segments.join('-'); // 格式: XXXX-XXXX-XXXX-XXXX
}
```

### 权限检查中间件
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: '未授权' }, { status: 401 });
}
if (session.user.role !== 'SUPER_ADMIN') {
  return NextResponse.json({ error: '权限不足' }, { status: 403 });
}
```

---

## 注意事项

1. **安全性**
   - 所有管理端 API 必须验证超级管理员权限
   - 卡密生成使用随机字符确保唯一性
   - 已使用的卡密不能删除（保留审计记录）

2. **性能**
   - 批量生成限制 1-1000 张
   - 使用数据库索引优化查询
   - 批量删除使用事务确保一致性

3. **用户体验**
   - 卡密格式易读（带分隔符）
   - 去除易混淆字符（0/O、1/I）
   - 时间叠加避免用户损失已有订阅
   - 提供详细的错误提示

4. **Prisma 7 特性**
   - 客户端导入: `import { ... } from '@/generated/prisma/client'`
   - 枚举导入: `import { ... } from '@/generated/prisma/enums'`
   - 输出路径: `src/generated/prisma`

---

## 执行方式选择

计划已完成并保存。请选择执行方式:

**1. Subagent-Driven (当前会话)**
- 在当前会话中执行
- 每个任务使用新的子代理
- 任务间进行代码审查
- 快速迭代

**2. Parallel Session (独立会话)**
- 在新会话中执行
- 使用 executing-plans 技能
- 批量执行带检查点
- 适合长时间运行

**选择哪种方式?**
