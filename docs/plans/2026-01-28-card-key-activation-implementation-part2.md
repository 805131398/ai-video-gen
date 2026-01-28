# 卡密激活功能实施计划 (Part 2)

> 本文档是 `2026-01-28-card-key-activation-implementation.md` 的续篇，包含 Task 3-6

---

## Task 3: 用户端 API - 激活接口

**文件**:
- Create: `web/src/app/api/activation/activate/route.ts`
- Create: `web/src/app/api/activation/status/route.ts`
- Create: `web/src/app/api/activation/history/route.ts`

**Step 1: 创建激活 API**

创建文件 `web/src/app/api/activation/activate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { activateCode } from '@/lib/services/activation-service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '卡密格式错误' }, { status: 400 });
    }

    const result = await activateCode(session.user.id, code.trim());

    return NextResponse.json({
      success: true,
      data: {
        type: result.type,
        expiresAt: result.expiresAt.toISOString(),
        daysAdded: result.daysAdded,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_CODE') {
        return NextResponse.json({ error: 'INVALID_CODE', message: '卡密不存在' }, { status: 400 });
      }
      if (error.message === 'CODE_ALREADY_USED') {
        return NextResponse.json({ error: 'CODE_ALREADY_USED', message: '卡密已被使用' }, { status: 400 });
      }
    }
    console.error('激活卡密失败:', error);
    return NextResponse.json({ error: '激活失败' }, { status: 500 });
  }
}
```

**Step 2: 创建订阅状态查询 API**

创建文件 `web/src/app/api/activation/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSubscriptionStatus } from '@/lib/services/activation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const status = await getSubscriptionStatus(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        expiresAt: status.expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('查询订阅状态失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
```

**Step 3: 创建激活历史查询 API**

创建文件 `web/src/app/api/activation/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActivationHistory } from '@/lib/services/activation-service';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const history = await getActivationHistory(session.user.id);

    return NextResponse.json({
      success: true,
      data: history.map(item => ({
        ...item,
        activatedAt: item.activatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('查询激活历史失败:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
```

**Step 4: 提交用户端 API 代码**

```bash
git add web/src/app/api/activation/
git commit -m "feat(api): 实现用户端激活 API

- POST /api/activation/activate - 激活卡密
- GET /api/activation/status - 查询订阅状态
- GET /api/activation/history - 查询激活历史"
```

---

