# 修复激活页面无限循环请求问题

**日期**: 2026-01-28
**问题**: Electron 客户端进入激活卡密页面后,会一直循环请求 `/api/activation/history` 和 `/api/auth/refresh`

## 问题分析

### 根本原因
系统存在两套认证机制,但激活相关的 API 端点只支持其中一种:

1. **NextAuth (Web 应用)**: 基于 cookie 的 session 认证
2. **JWT Bearer Token (Electron 客户端)**: 基于 Authorization header 的 JWT 认证

激活相关的 API 端点 (`/api/activation/history`, `/api/activation/activate`, `/api/activation/status`) 使用 NextAuth 的 `auth()` 函数进行认证,该函数只能识别 NextAuth 的 session cookie,无法处理 Electron 客户端发送的 Bearer token。

### 循环流程
1. Electron 客户端请求 `/api/activation/history`,发送 Bearer token
2. NextAuth 的 `auth()` 无法从 Bearer token 中获取 session
3. API 返回 401 Unauthorized
4. Electron 客户端的 axios 拦截器捕获 401,调用 `/api/auth/refresh` 刷新 token
5. 刷新成功后,重试原请求
6. 再次返回 401,进入无限循环

## 解决方案

### 1. 创建统一认证中间件
创建 `web/src/lib/auth-middleware.ts`,支持两种认证方式:

```typescript
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 方式 1: 尝试从 Authorization header 获取 JWT token (Electron 客户端)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = verify(token, JWT_SECRET) as AuthUser;
      return { id, phone, email, tenantId };
    } catch (error) {
      // JWT 验证失败,继续尝试 NextAuth
    }
  }

  // 方式 2: 尝试从 NextAuth session 获取用户信息 (Web 应用)
  const session = await auth();
  if (session?.user?.id) {
    return { id, phone, email };
  }

  return null;
}
```

### 2. 更新激活相关 API 端点
将以下端点从使用 `auth()` 改为使用 `getAuthUser()`:

- `web/src/app/api/activation/history/route.ts`
- `web/src/app/api/activation/activate/route.ts`
- `web/src/app/api/activation/status/route.ts`

修改前:
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}
const userId = session.user.id;
```

修改后:
```typescript
const user = await getAuthUser(request);
if (!user?.id) {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}
const userId = user.id;
```

### 3. 修复响应格式不匹配
Electron 客户端期望的字段名是 snake_case,但 API 返回的是 camelCase。

修改 `/api/activation/history` 的响应格式:
```typescript
// 修改前
records: history.map(item => ({
  ...item,
  activatedAt: item.activatedAt.toISOString(),
}))

// 修改后
records: history.map(item => ({
  id: item.id,
  code: item.code,
  type: item.type,
  activated_at: item.activatedAt.toISOString(),
  expires_at: new Date(
    item.activatedAt.getTime() + item.daysAdded * 24 * 60 * 60 * 1000
  ).toISOString(),
}))
```

## 修改的文件

1. **新增文件**:
   - `web/src/lib/auth-middleware.ts` - 统一认证中间件

2. **修改文件**:
   - `web/src/app/api/activation/history/route.ts` - 使用统一认证 + 修复响应格式
   - `web/src/app/api/activation/activate/route.ts` - 使用统一认证
   - `web/src/app/api/activation/status/route.ts` - 使用统一认证

## 测试验证

修复后,Electron 客户端应该能够:
1. 正常访问激活页面,不再出现无限循环请求
2. 成功获取激活历史记录
3. 正常激活卡密
4. 正常查询订阅状态

Web 应用的激活功能(如果有)也应该继续正常工作。

## 注意事项

1. 统一认证中间件优先尝试 JWT Bearer token,然后才尝试 NextAuth session
2. JWT_SECRET 使用与登录 API 相同的密钥 (NEXTAUTH_SECRET 或 AUTH_SECRET)
3. 响应格式已统一为 Electron 客户端期望的 snake_case 格式
4. 如果未来需要添加更多需要认证的 API 端点,应该使用 `getAuthUser()` 而不是 `auth()`
