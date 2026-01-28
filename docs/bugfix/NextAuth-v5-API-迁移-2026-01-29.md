# NextAuth.js v5 API 迁移修复

**日期**: 2026-01-29
**类型**: Bug 修复
**影响范围**: Web API 路由 - 视频生成相关接口

## 问题描述

项目使用的是 NextAuth.js v5，但部分 API 路由仍在使用 v4 的 API，导致构建错误：

```
Export authOptions doesn't exist in target module
Export getServerSession doesn't exist in target module
```

### 错误原因

NextAuth.js v5 进行了重大 API 变更：
- ❌ `authOptions` 不再导出
- ❌ `getServerSession()` 已被移除
- ✅ 使用 `auth()` 函数替代

## 修复方案

### API 变更对照

| NextAuth.js v4 | NextAuth.js v5 |
|----------------|----------------|
| `import { getServerSession } from "next-auth"` | `import { auth } from "@/lib/auth"` |
| `import { authOptions } from "@/lib/auth"` | （不需要） |
| `const session = await getServerSession(authOptions)` | `const session = await auth()` |

### Next.js 15+ 路由参数变更

同时修复了 Next.js 15+ 中 params 类型的变更：

```typescript
// 旧版本
{ params }: { params: { id: string } }

// 新版本（Next.js 15+）
{ params }: { params: Promise<{ id: string }> }

// 使用时需要 await
const { id } = await params;
```

### Prisma 客户端使用

将直接创建 `PrismaClient` 实例改为使用项目单例：

```typescript
// 旧版本
import { PrismaClient } from "@/generated/prisma/client";
const prisma = new PrismaClient();

// 新版本
import { prisma } from "@/lib/prisma";
```

## 修改的文件

### 1. `/api/projects/[id]/scripts/[scriptId]/videos/status/route.ts`

**修改内容**：
- 移除 `getServerSession` 和 `authOptions` 导入
- 添加 `auth` 导入
- 更新认证调用方式
- 修复 params 类型为 Promise
- 使用 prisma 单例

**修改前**：
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; scriptId: string } }
) {
  const session = await getServerSession(authOptions);
  const { id: projectId, scriptId } = params;
  // ...
}
```

**修改后**：
```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  const session = await auth();
  const { id: projectId, scriptId } = await params;
  // ...
}
```

### 2. `/api/projects/[id]/scripts/[scriptId]/scenes/reorder/route.ts`

**修改内容**：
- 移除 `getServerSession` 和 `authOptions` 导入
- 添加 `auth` 导入
- 更新认证调用方式
- params 类型已经是 Promise（无需修改）

### 3. `/api/projects/[id]/scripts/[scriptId]/generate-videos/route.ts`

**修改内容**：
- 移除 `getServerSession` 和 `authOptions` 导入
- 添加 `auth` 导入
- 更新认证调用方式
- 修复 params 类型为 Promise
- 使用 prisma 单例

## 影响的功能

修复后，以下功能恢复正常：

1. **视频生成状态查询** (`GET /api/projects/[id]/scripts/[scriptId]/videos/status`)
   - 查询剧本所有场景的视频生成状态
   - 返回整体进度和各场景详情

2. **场景排序** (`PUT /api/projects/[id]/scripts/[scriptId]/scenes/reorder`)
   - 批量更新场景的排序顺序

3. **批量生成视频** (`POST /api/projects/[id]/scripts/[scriptId]/generate-videos`)
   - 为剧本的所有场景生成视频
   - 后台异步处理视频生成任务

## 验证步骤

1. 重启开发服务器
2. 访问剧本编辑器页面
3. 测试以下功能：
   - 查看视频生成状态
   - 拖拽场景重新排序
   - 点击"生成视频"按钮
4. 确认没有 405 或其他认证相关错误

## 技术要点

### NextAuth.js v5 认证模式

v5 版本简化了认证 API：
- 统一使用 `auth()` 函数
- 自动处理 session 获取
- 更好的 TypeScript 类型支持

### Next.js 15+ 动态路由

Next.js 15+ 中所有动态路由参数都是异步的：
- `params` 是 `Promise` 类型
- 使用前必须 `await`
- 提高了路由处理的灵活性

### Prisma 单例模式

使用单例模式避免创建多个数据库连接：
- 开发环境：避免热重载时连接泄漏
- 生产环境：优化连接池使用
- 统一的错误处理和日志记录

## 相关文档

- NextAuth.js v5 迁移指南: https://authjs.dev/getting-started/migrating-to-v5
- Next.js 15 路由变更: https://nextjs.org/docs/app/building-your-application/upgrading/version-15

## 后续建议

1. 检查其他可能使用旧 API 的文件
2. 更新项目文档，说明使用 NextAuth.js v5
3. 考虑添加 ESLint 规则，防止使用已废弃的 API
