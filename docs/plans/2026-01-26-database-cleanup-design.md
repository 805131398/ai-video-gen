# 数据库精简设计方案

> 日期: 2026-01-26
> 目标: 移除业务相关内容，保留基本系统功能

## 概述

将当前的 MLM/加盟管理系统精简为通用后台管理系统，移除所有业务特定功能（门店、产品、订单、奖励），保留核心系统功能（用户、角色、权限、配置等）。

## 变更范围

### 删除的业务模块
- Store 门店管理
- Product 产品管理
- Order 订单管理
- Reward 奖励系统
- Upgrade 升级记录
- StockLog 库存日志

### 保留的系统模块
- 多租户系统 (Tenant)
- 用户管理 (User)
- 角色权限管理 (Role, Permission)
- 菜单管理 (Menu)
- 系统配置 (SystemConfig)
- 文件管理 (File, StorageProvider)
- 定时任务 (ScheduledTask, TaskExecutionLog)
- 操作日志 (OperationLog)
- 字典管理 (Dict, DictItem)

---

## 第一部分：数据库精简设计

### 数据库表变更

从 **35 张表** 精简到 **20 张表**。

#### 保留的表 (20张)

| 分类 | 表名 | 说明 |
|------|------|------|
| 多租户 | Tenant | 租户管理 |
| 认证 | User | 用户表（移除 storeId） |
| 认证 | Account | OAuth 账号绑定 |
| 认证 | Session | NextAuth 会话 |
| 认证 | VerificationToken | 验证令牌 |
| 权限 | Role | 角色表 |
| 权限 | Permission | 权限定义 |
| 权限 | UserRole | 用户角色关联 |
| 权限 | RolePermission | 角色权限关联 |
| 权限 | RoleMenu | 角色菜单关联 |
| 菜单 | Menu | 菜单配置 |
| 系统 | SystemConfig | 系统配置 |
| 系统 | Dict | 字典表 |
| 系统 | DictItem | 字典项 |
| 系统 | OperationLog | 操作日志 |
| 系统 | Notification | 通知 |
| 任务 | ScheduledTask | 定时任务 |
| 任务 | TaskExecutionLog | 任务执行日志 |
| 文件 | StorageProvider | 存储提供商 |
| 文件 | File | 文件记录 |

#### 删除的表 (15张)

| 表名 | 原用途 |
|------|--------|
| Store | 门店管理 |
| ProductCategory | 产品分类 |
| Product | 产品 |
| ProductRolePrice | 角色价格 |
| ProductBonusRule | 产品加赠规则 |
| Order | 订单 |
| UpgradeRecord | 升级记录 |
| RewardRecord | 奖励记录 |
| StockLog | 库存日志 |

#### 修改的表

| 表名 | 修改内容 |
|------|----------|
| User | 移除 `storeId` 字段 |

#### 删除的枚举类型

- StoreRole, StoreStatus
- ProductBonusRuleType
- OrderType, OrderStatus
- UpgradeType, UpgradeStatus
- RewardType
- StockChangeType

### 精简后的数据库关系

```
Tenant (租户)
├── User (用户)
│   ├── Account (OAuth账号)
│   ├── Session (会话)
│   └── UserRole → Role → RolePermission → Permission
│                      └── RoleMenu → Menu
├── SystemConfig (系统配置)
├── Dict → DictItem (字典)
├── OperationLog (操作日志)
├── Notification (通知)
├── ScheduledTask → TaskExecutionLog (定时任务)
└── StorageProvider → File (文件管理)
```

---

## 第二部分：页面与路由变更

### 删除的路由

| 路由 | 说明 |
|------|------|
| `/admin/stores/*` | 门店管理 |
| `/admin/products/*` | 产品管理 |
| `/admin/orders/*` | 订单管理 |
| `/admin/upgrades/*` | 升级审核 |
| `/admin/rewards/*` | 奖励管理 |

### 保留的路由

```
/admin              (Dashboard - 简化为系统统计)
├── /users          (用户管理)
├── /roles          (角色管理)
├── /menus          (菜单管理)
├── /configs        (系统配置)
├── /logs           (操作日志 - 新增页面)
├── /dicts          (字典管理 - 新增页面)
├── /tasks          (定时任务 - 新增页面)
├── /files          (文件管理 - 新增页面)
└── /notifications  (通知管理 - 新增页面)
```

### 新增页面 (5个)

1. **操作日志** `/admin/logs` - 日志列表、筛选、导出
2. **字典管理** `/admin/dicts` - 字典和字典项 CRUD
3. **定时任务** `/admin/tasks` - 任务管理、执行日志
4. **文件管理** `/admin/files` - 文件上传、预览、删除
5. **通知管理** `/admin/notifications` - 发送通知、管理通知

### 侧边栏菜单结构

```
首页
用户管理
角色管理
系统设置
  ├── 菜单管理
  ├── 系统配置
  └── 字典管理
监控与日志
  ├── 操作日志
  └── 定时任务
内容管理
  ├── 文件管理
  └── 通知管理
```

---

## 第三部分：代码修改计划

### 1. 数据库层修改

**文件:** `/web/prisma/schema.prisma`

```prisma
// 删除模型
model Store { ... }
model ProductCategory { ... }
model Product { ... }
model ProductRolePrice { ... }
model ProductBonusRule { ... }
model Order { ... }
model UpgradeRecord { ... }
model RewardRecord { ... }
model StockLog { ... }

// 修改 User 模型 - 移除 storeId
model User {
  // 移除: storeId String? @unique
  // 移除: store Store? @relation(...)
}

// 删除枚举
enum StoreRole { ... }
enum StoreStatus { ... }
// ... 其他业务枚举
```

**执行迁移:**

```bash
npx prisma migrate dev --name remove_business_models
npx prisma generate
```

### 2. 权限系统修改

**文件:** `/web/prisma/seed-permissions.ts`

保留的权限组:
- user:* (6个)
- role:* (5个)
- menu:* (4个)
- config:* (2个)
- log:* (1个)
- file:* (3个)
- task:* (3个)
- dict:* (3个)
- notification:* (3个)

删除的权限组:
- store:* (6个)
- order:* (2个)
- upgrade:* (2个)

### 3. 删除文件清单

```
/web/src/app/admin/stores/       (删除整个目录)
/web/src/app/admin/products/     (删除整个目录)
/web/src/app/admin/orders/       (删除整个目录)
/web/src/app/admin/upgrades/     (删除整个目录)
/web/src/app/admin/rewards/      (删除整个目录)
/web/src/components/admin/stores/
/web/src/components/admin/products/
/web/src/components/admin/orders/
/web/src/components/admin/upgrades/
/web/src/components/admin/rewards/
```

### 4. 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `/web/src/app/admin/users/actions.ts` | 移除 storeId 相关逻辑 |
| `/web/src/app/admin/page.tsx` | 简化 Dashboard 统计 |
| `/web/prisma/seed-permissions.ts` | 简化权限定义 |

---

## 实施步骤

### 步骤 1: 数据库层
1. 修改 `schema.prisma`
2. 创建并执行迁移
3. 重新生成 Prisma Client

### 步骤 2: 权限系统
1. 修改 `seed-permissions.ts`
2. 运行 seed 脚本

### 步骤 3: 删除代码
1. 删除业务页面目录
2. 删除 Server Actions 文件
3. 删除业务组件

### 步骤 4: 修改现有代码
1. 修改 `users/actions.ts`
2. 修改 Dashboard 页面
3. 修复类型错误

### 步骤 5: 新增系统页面 (可选)
1. 创建 `/admin/logs`
2. 创建 `/admin/dicts`
3. 创建 `/admin/tasks`
4. 创建 `/admin/files`
5. 创建 `/admin/notifications`

---

## 风险与注意事项

1. **数据丢失**: 执行迁移前需备份数据库
2. **类型错误**: Prisma 重新生成后需修复所有类型引用
3. **权限清理**: 需要清理数据库中已存在的业务权限数据
4. **菜单清理**: 需要清理数据库中已存在的业务菜单数据
