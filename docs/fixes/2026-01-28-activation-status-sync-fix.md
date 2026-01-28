# 激活状态同步修复

## 问题描述

在客户端激活页面中，激活历史和订阅状态显示不匹配的问题：
- 激活历史显示的是从服务器实时获取的最新数据
- 订阅状态显示的是 Zustand store 中缓存的旧数据
- 导致用户看到的激活状态与实际激活历史不一致

**更严重的问题：**
- 后端 API 返回的字段名与前端期望的不匹配
- 登录 API 返回的是硬编码的订阅状态，而不是实际查询的状态

## 根本原因

### 1. 前端状态同步问题
在 `client/src/pages/Activate.tsx` 中：
1. 组件挂载时只调用 `getActivationHistory()` 获取激活历史
2. 没有同时调用 `getSubscriptionStatus()` 更新订阅状态
3. 订阅状态只在登录、App 初始化或激活成功后更新
4. 如果用户刷新页面或长时间停留，状态会不同步

### 2. 后端字段映射问题
在 `web/src/app/api/activation/status/route.ts` 中：
- 后端服务返回 `hasSubscription` 和 `isExpired` 字段
- 但前端期望 `isActive` 字段
- 导致前端无法正确解析订阅状态

### 3. 登录 API 硬编码问题
在 `web/src/app/api/auth/login/route.ts` 中：
- 返回硬编码的订阅状态 `{ is_active: true }`
- 没有查询用户的实际订阅状态
- 导致登录后显示错误的激活状态

## 解决方案

### 修改文件
1. `client/src/pages/Activate.tsx` - 前端激活页面
2. `web/src/app/api/activation/status/route.ts` - 订阅状态 API
3. `web/src/app/api/auth/login/route.ts` - 登录 API

### 主要改动

#### 1. 前端：同步获取激活历史和订阅状态

**client/src/pages/Activate.tsx**

导入订阅状态 API：
```typescript
import { activateCode, getActivationHistory, getSubscriptionStatus } from '../services/auth';
```

重构数据加载函数：
```typescript
const loadData = async () => {
  try {
    // 同时获取激活历史和订阅状态
    const [records, status] = await Promise.all([
      getActivationHistory(),
      getSubscriptionStatus(),
    ]);
    setHistory(records);
    updateSubscription(status);
  } catch (err) {
    console.error('Failed to load data:', err);
  }
};
```

更新调用点：
- 组件挂载时调用 `loadData()`
- 激活成功后调用 `loadData()` 而不是 `loadHistory()`

#### 2. 后端：修复字段映射

**web/src/app/api/activation/status/route.ts**

转换为前端期望的格式：
```typescript
return NextResponse.json({
  success: true,
  data: {
    isActive: status.hasSubscription && !status.isExpired,
    type: status.type,
    expiresAt: status.expiresAt?.toISOString(),
    daysRemaining: status.daysRemaining,
  },
});
```

#### 3. 后端：登录时查询实际订阅状态

**web/src/app/api/auth/login/route.ts**

导入订阅服务：
```typescript
import { getSubscriptionStatus } from "@/lib/services/activation-service";
```

查询并返回实际订阅状态：
```typescript
// 查询用户订阅状态
const subscriptionStatus = await getSubscriptionStatus(user.id);

// 返回用户信息和令牌
return NextResponse.json({
  // ... user and tokens
  subscription: {
    is_active: subscriptionStatus.hasSubscription && !subscriptionStatus.isExpired,
    type: subscriptionStatus.type?.toLowerCase(),
    expires_at: subscriptionStatus.expiresAt?.toISOString(),
    days_remaining: subscriptionStatus.daysRemaining || 0,
  },
});
```

## 效果

修复后：
- ✅ 页面加载时同步获取激活历史和订阅状态
- ✅ 激活成功后重新同步两者数据
- ✅ 后端 API 返回正确的字段名（isActive）
- ✅ 登录时返回实际的订阅状态，而不是硬编码值
- ✅ 确保显示的订阅状态与激活历史始终一致
- ✅ 使用 `Promise.all` 并行请求，提高加载效率

## 测试建议

1. 登录后检查订阅状态是否正确显示
2. 进入激活页面，检查订阅状态与激活历史是否一致
3. 激活一个新卡密，检查状态是否立即更新
4. 刷新页面，检查状态是否保持一致
5. 测试已过期的订阅是否正确显示为"未激活"
6. 测试有效订阅是否正确显示类型、到期时间和剩余天数

## 相关文件

- `client/src/pages/Activate.tsx` - 激活页面组件
- `client/src/services/auth.ts` - 认证服务 API
- `client/src/store/auth.ts` - 认证状态管理
- `web/src/app/api/activation/status/route.ts` - 订阅状态 API
- `web/src/app/api/activation/history/route.ts` - 激活历史 API
- `web/src/app/api/auth/login/route.ts` - 登录 API
- `web/src/lib/services/activation-service.ts` - 激活服务层
