# AI 调用日志集成 - Bug 修复记录

**日期**: 2026-02-14
**Bug ID**: tenantId 外键约束违反
**状态**: ✅ 已修复

---

## 问题描述

**错误信息**:
```
Foreign key constraint violated on the constraint: `ai_usage_logs_tenant_id_fkey`
```

**触发场景**:
- 用户测试 `preview-prompt` 接口
- 用户没有关联 `tenantId`（为 `undefined`）
- 代码使用 `tenantId || ""` 传入空字符串
- Prisma 尝试创建外键关联到不存在的租户（空字符串）

---

## 根本原因

### Schema 定义
```prisma
model AIUsageLog {
  tenantId String? @map("tenant_id")
  tenant   Tenant? @relation(fields: [tenantId], references: [id])
  // ...
}
```

`tenantId` 是**可选字段** (`String?`)，可以是：
- 有效的租户 ID（存在于 Tenant 表中）
- `null`（无租户关联）

但**不能**是空字符串 `""`，因为这会被视为一个有效的字符串值，Prisma 会尝试查找 ID 为 `""` 的租户。

### 错误代码模式
```typescript
// ❌ 错误：当 tenantId 为 undefined 时变成空字符串
tenantId: tenantId || ""

// ✅ 正确：当 tenantId 为 undefined 时变成 null
tenantId: tenantId || null
```

---

## 修复方案

### 1. 修改类型定义

**文件**: `src/lib/services/ai-usage-service.ts`

```typescript
interface LogAIUsageParams {
  tenantId: string | null;  // 改为允许 null
  // ...
}
```

### 2. 批量替换所有使用位置

使用 sed 命令批量替换：
```bash
find src -name "*.ts" -type f -exec sed -i '' 's/tenantId: tenantId || ""/tenantId: tenantId || null/g' {} +
```

**影响的文件**:
- `src/lib/services/video-prompt-builder.ts` (2 处)
- `src/lib/ai/translator.ts` (2 处)
- `src/lib/services/video-polling-service.ts` (3 处)
- `src/app/api/projects/[id]/steps/[step]/generate/route.ts` (2 处)
- `src/app/api/projects/[id]/characters/[characterId]/digital-humans/generate/route.ts` (2 处)

**总计**: 11 处修改

---

## 验证方法

### 场景 1: 有租户的用户
```typescript
// tenantId = "valid-tenant-id"
tenantId: tenantId || null  // → "valid-tenant-id" ✅
```

### 场景 2: 无租户的用户
```typescript
// tenantId = undefined
tenantId: tenantId || null  // → null ✅
```

### 场景 3: 空字符串（不应该出现，但万一）
```typescript
// tenantId = ""
tenantId: tenantId || null  // → null ✅
```

---

## 相关 Prisma 知识

### 可选外键字段的正确用法

```prisma
model Child {
  parentId String?  // 可选字段
  parent   Parent? @relation(fields: [parentId], references: [id])
}
```

**有效值**:
- `"valid-parent-id"` - 关联到存在的 Parent
- `null` - 无关联
- `undefined` - Prisma 会转为 `null`

**无效值**:
- `""` - 空字符串会触发外键约束查找
- `"non-existent-id"` - 不存在的 ID 会违反外键约束

### 最佳实践

```typescript
// ✅ 推荐：使用 nullish coalescing (??)
tenantId: tenantId ?? null

// ✅ 可以：使用逻辑或 (||)
tenantId: tenantId || null

// ❌ 避免：使用空字符串
tenantId: tenantId || ""

// ❌ 避免：不处理 undefined
tenantId: tenantId  // 可能传入 undefined
```

---

## 影响范围

### 受影响的功能
- ✅ 视频提示词优化
- ✅ 文本翻译服务
- ✅ 步骤式生成（标题、文案）
- ✅ 数字人生成
- ✅ 视频轮询服务

### 不受影响的功能
- 所有通过 `withUsageLogging()` 包装的 API
- 原因：这些 API 从 session 获取 tenantId，通常不为空

---

## 测试建议

### 测试用例 1: 有租户的用户
```bash
# 1. 登录有租户的用户
# 2. 调用任意 AI 接口
# 3. 检查日志记录正常
# 4. 验证 tenantId 字段为有效租户 ID
```

### 测试用例 2: 无租户的用户
```bash
# 1. 创建或使用无租户的测试用户
# 2. 调用 preview-prompt 接口
# 3. 检查日志记录正常
# 4. 验证 tenantId 字段为 null
```

### SQL 验证
```sql
-- 查看最近的日志记录
SELECT id, tenant_id, user_id, model_type, status
FROM ai_usage_logs
ORDER BY created_at DESC
LIMIT 10;

-- 统计 tenantId 为 null 的记录
SELECT COUNT(*) FROM ai_usage_logs WHERE tenant_id IS NULL;

-- 确认没有空字符串
SELECT COUNT(*) FROM ai_usage_logs WHERE tenant_id = '';  -- 应该返回 0
```

---

## 经验教训

### 1. 外键字段必须谨慎处理
- 可选外键只能是有效 ID 或 `null`
- 空字符串 `""` 不是有效的 `null` 替代品

### 2. TypeScript 类型要准确
```typescript
// ❌ 不准确：允许空字符串
tenantId: string

// ✅ 准确：明确允许 null
tenantId: string | null
```

### 3. 使用默认值要小心
```typescript
// ❌ 危险：可能产生空字符串
const value = param || ""

// ✅ 安全：对于外键使用 null
const value = param || null
```

---

## 后续预防措施

### 1. 代码审查检查项
- [ ] 所有外键字段使用 `|| null` 而不是 `|| ""`
- [ ] TypeScript 类型定义与 Prisma schema 一致
- [ ] 可选字段明确标注 `| null` 或 `| undefined`

### 2. 测试覆盖
- [ ] 单元测试覆盖有/无租户两种场景
- [ ] 集成测试验证外键约束
- [ ] E2E 测试模拟无租户用户操作

### 3. Linting 规则（可选）
```javascript
// ESLint 规则建议
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "BinaryExpression[operator='||'][right.value='']",
        "message": "避免使用空字符串作为默认值，考虑使用 null"
      }
    ]
  }
}
```

---

**修复提交**: 6cd3fe8
**修复人员**: Claude Code
**验证状态**: ⏳ 待用户测试
**优先级**: 🔴 Critical (阻塞功能)
