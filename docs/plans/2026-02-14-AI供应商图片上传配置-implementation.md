# AI 供应商图片上传配置 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 AI 供应商图片上传配置的完整功能链路：数据库模型 → 服务端 API → 加密凭证接口 → Admin 管理页面 → 客户端本地缓存表 + IPC 接口。

**Architecture:** 服务端新增 `AIProviderUploadConfig` Prisma 模型 + CRUD API + 加密凭证 API。Admin 页面在现有 `/admin/ai-config` 中加 Tab 切换。客户端新增 SQLite 表 `provider_upload_records` + IPC handlers + preload 桥接。

**Tech Stack:** Prisma 7, Next.js 16 App Router, shadcn/ui, SQLite (better-sqlite3), AES-256-GCM, PBKDF2

---

### Task 1: Prisma 模型 + 数据库迁移

**Files:**
- Modify: `web/prisma/schema.prisma`

**Step 1: 在 schema.prisma 中添加 AIProviderUploadConfig 模型**

在 `AIModelConfig` 模型之后（约 line 655）添加：

```prisma
// AI 供应商图片上传配置
model AIProviderUploadConfig {
  id              String   @id @default(uuid())
  tenantId        String?  @map("tenant_id")
  providerName    String   @map("provider_name")
  displayName     String   @map("display_name")
  uploadUrl       String   @map("upload_url")
  authType        String   @map("auth_type")
  apiKey          String   @map("api_key")
  responseUrlPath String   @map("response_url_path")
  config          Json?
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  tenant Tenant? @relation(fields: [tenantId], references: [id])

  @@map("ai_provider_upload_configs")
}
```

**Step 2: 在 Tenant 模型中添加关联**

在 `web/prisma/schema.prisma` 的 Tenant 模型的关联区域（约 line 153，`aiUsageLogs` 之后）添加：

```prisma
  aiProviderUploadConfigs AIProviderUploadConfig[]
```

**Step 3: 生成 Prisma Client + 推送数据库**

```bash
cd web && pnpm db:generate && pnpm db:push
```

Expected: Prisma client regenerated, `ai_provider_upload_configs` 表已创建。

**Step 4: Commit**

```bash
git add web/prisma/schema.prisma
git commit -m "feat: add AIProviderUploadConfig prisma model"
```

---

### Task 2: 服务端 Admin CRUD API

**Files:**
- Create: `web/src/app/api/admin/upload-configs/route.ts`
- Create: `web/src/app/api/admin/upload-configs/[id]/route.ts`

**Step 1: 创建列表 + 新建 API**

创建 `web/src/app/api/admin/upload-configs/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/upload-configs - 获取上传配置列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const configs = await prisma.aIProviderUploadConfig.findMany({
      where: {
        tenantId: null, // 系统级配置
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error("获取上传配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST /api/admin/upload-configs - 创建上传配置
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();

    const config = await prisma.aIProviderUploadConfig.create({
      data: {
        providerName: body.providerName,
        displayName: body.displayName,
        uploadUrl: body.uploadUrl,
        authType: body.authType,
        apiKey: body.apiKey,
        responseUrlPath: body.responseUrlPath,
        config: body.config || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    console.error("创建上传配置失败:", error);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
```

**Step 2: 创建详情 + 更新 + 删除 API**

创建 `web/src/app/api/admin/upload-configs/[id]/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/upload-configs/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const config = await prisma.aIProviderUploadConfig.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json({ error: "配置不存在" }, { status: 404 });
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("获取上传配置失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT /api/admin/upload-configs/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const config = await prisma.aIProviderUploadConfig.update({
      where: { id },
      data: {
        providerName: body.providerName,
        displayName: body.displayName,
        uploadUrl: body.uploadUrl,
        authType: body.authType,
        apiKey: body.apiKey,
        responseUrlPath: body.responseUrlPath,
        config: body.config,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("更新上传配置失败:", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

// DELETE /api/admin/upload-configs/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.aIProviderUploadConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除上传配置失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add web/src/app/api/admin/upload-configs/
git commit -m "feat: add admin CRUD API for upload configs"
```

---

### Task 3: 加密凭证 API

**Files:**
- Create: `web/src/lib/crypto.ts`
- Create: `web/src/app/api/upload-configs/credential/route.ts`

**Step 1: 创建加密工具模块**

创建 `web/src/lib/crypto.ts`：

```typescript
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const SALT = process.env.ENCRYPTION_SALT || "ai-video-gen-upload-salt-2026";
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // AES-256
const ALGORITHM = "aes-256-gcm";

/**
 * 从 session token 派生加密密钥
 */
export function deriveKey(sessionToken: string): Buffer {
  return pbkdf2Sync(sessionToken, SALT, ITERATIONS, KEY_LENGTH, "sha256");
}

/**
 * AES-256-GCM 加密
 */
export function encrypt(plaintext: string, key: Buffer): { encrypted: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

/**
 * AES-256-GCM 解密
 */
export function decrypt(encrypted: string, key: Buffer, iv: string, authTag: string): string {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
```

**Step 2: 创建凭证接口**

创建 `web/src/app/api/upload-configs/credential/route.ts`：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deriveKey, encrypt } from "@/lib/crypto";

// GET /api/upload-configs/credential?providerName=toapis
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerName = searchParams.get("providerName");

    // 查找配置：指定供应商或第一个可用的
    const config = await prisma.aIProviderUploadConfig.findFirst({
      where: {
        isActive: true,
        ...(providerName && { providerName }),
      },
      orderBy: { createdAt: "asc" },
    });

    if (!config) {
      return NextResponse.json(
        { error: providerName ? `未找到 ${providerName} 的上传配置` : "无可用上传配置" },
        { status: 404 }
      );
    }

    // 使用用户 ID 作为密钥派生种子（客户端也知道自己的 user ID）
    const key = deriveKey(session.user.id);
    const { encrypted, iv, authTag } = encrypt(config.apiKey, key);

    return NextResponse.json({
      success: true,
      data: {
        providerName: config.providerName,
        displayName: config.displayName,
        uploadUrl: config.uploadUrl,
        authType: config.authType,
        encryptedApiKey: encrypted,
        iv,
        authTag,
        responseUrlPath: config.responseUrlPath,
        config: config.config,
      },
    });
  } catch (error) {
    console.error("获取上传凭证失败:", error);
    return NextResponse.json({ error: "获取凭证失败" }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add web/src/lib/crypto.ts web/src/app/api/upload-configs/
git commit -m "feat: add encrypted credential API for provider upload"
```

---

### Task 4: Admin 页面 — 提取公共组件 + Tab 改造

**Files:**
- Create: `web/src/components/admin/LabelWithTooltip.tsx`
- Create: `web/src/components/admin/ChipSelector.tsx`
- Modify: `web/src/app/admin/ai-config/page.tsx`
- Modify: `web/src/app/admin/ai-config/[id]/page.tsx` (改为从公共组件导入)
- Modify: `web/src/components/admin/index.ts` (添加导出)

**Step 1: 提取 LabelWithTooltip 为公共组件**

创建 `web/src/components/admin/LabelWithTooltip.tsx`：

```typescript
"use client";

import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface LabelWithTooltipProps {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
}

export function LabelWithTooltip({ htmlFor, children, tooltip }: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
```

**Step 2: 提取 ChipSelector 为公共组件**

创建 `web/src/components/admin/ChipSelector.tsx`：

```typescript
"use client";

import { cn } from "@/lib/utils";

interface ChipSelectorProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  labels: Record<T, string>;
  disabled?: boolean;
}

export function ChipSelector<T extends string>({
  value,
  onChange,
  options,
  labels,
  disabled,
}: ChipSelectorProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            value === option
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-accent hover:text-accent-foreground border-input hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: 更新 admin/index.ts 导出**

在 `web/src/components/admin/index.ts` 中添加导出：

```typescript
export { LabelWithTooltip } from "./LabelWithTooltip";
export { ChipSelector } from "./ChipSelector";
```

**Step 4: 更新 ai-config/[id]/page.tsx 使用公共组件**

在 `web/src/app/admin/ai-config/[id]/page.tsx` 中：

- 删除文件内的 `LabelWithTooltip` 和 `ChipSelector` 组件定义（约 line 132-192）
- 将导入改为：
  ```typescript
  import { PageHeader, LabelWithTooltip, ChipSelector } from "@/components/admin";
  ```

**Step 5: 改造 ai-config/page.tsx 加入 Tab 切换**

修改 `web/src/app/admin/ai-config/page.tsx`，在 PageHeader 下方添加 Tab，将当前内容包在"模型配置" Tab 下，新增"图片上传配置" Tab 内容。

Tab 切换使用 `useState<"models" | "upload">("models")` 控制。Tab 样式使用与编辑页模型类型 Tab 一致的 `border-b-2` 风格：

```typescript
const [activeTab, setActiveTab] = useState<"models" | "upload">("models");
```

Tab UI（在 PageHeader 下方）：

```tsx
<div className="flex items-center gap-1 border-b">
  <button
    type="button"
    onClick={() => setActiveTab("models")}
    className={cn(
      "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
      activeTab === "models"
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    )}
  >
    <Settings className="h-4 w-4" />
    模型配置
  </button>
  <button
    type="button"
    onClick={() => setActiveTab("upload")}
    className={cn(
      "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
      activeTab === "upload"
        ? "border-primary text-primary"
        : "border-transparent text-muted-foreground hover:text-foreground"
    )}
  >
    <Upload className="h-4 w-4" />
    图片上传配置
  </button>
</div>
```

PageHeader 的 actions 按钮根据 activeTab 动态切换：
- `models` tab → `新增配置` 按钮跳转 `/admin/ai-config/new`
- `upload` tab → `新增上传配置` 按钮跳转 `/admin/ai-config/upload/new`

**Step 6: Commit**

```bash
git add web/src/components/admin/ web/src/app/admin/ai-config/
git commit -m "feat: extract shared components and add tab switch to ai-config page"
```

---

### Task 5: Admin 页面 — 图片上传配置列表

**Files:**
- Modify: `web/src/app/admin/ai-config/page.tsx` (在 upload tab 中添加列表)

**Step 1: 在 page.tsx 中添加上传配置列表逻辑**

添加上传配置相关的 state 和 fetch：

```typescript
interface UploadConfig {
  id: string;
  providerName: string;
  displayName: string;
  uploadUrl: string;
  authType: string;
  apiKey: string;
  responseUrlPath: string;
  config?: Record<string, unknown>;
  isActive: boolean;
}

const [uploadConfigs, setUploadConfigs] = useState<UploadConfig[]>([]);
const [uploadLoading, setUploadLoading] = useState(false);

async function fetchUploadConfigs() {
  setUploadLoading(true);
  try {
    const res = await fetch("/api/admin/upload-configs");
    const data = await res.json();
    setUploadConfigs(data.data || []);
  } catch {
    toast.error("获取上传配置失败");
  } finally {
    setUploadLoading(false);
  }
}
```

在 `activeTab === "upload"` 切换时触发 fetch（useEffect 监听 activeTab）。

上传配置列表 Table 与现有模型配置列表风格一致：

```tsx
{activeTab === "upload" && (
  <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>供应商</TableHead>
          <TableHead>显示名称</TableHead>
          <TableHead>上传地址</TableHead>
          <TableHead>认证方式</TableHead>
          <TableHead>API Key</TableHead>
          <TableHead>状态</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {uploadConfigs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              暂无配置，点击"新增上传配置"添加
            </TableCell>
          </TableRow>
        ) : (
          uploadConfigs.map((config) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">{config.providerName}</TableCell>
              <TableCell>{config.displayName}</TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                  {config.uploadUrl}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{AUTH_TYPE_LABELS[config.authType] || config.authType}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {showApiKey[config.id] ? config.apiKey : maskApiKey(config.apiKey)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowApiKey(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                  >
                    {showApiKey[config.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={config.isActive ? "default" : "secondary"}>
                  {config.isActive ? "启用" : "禁用"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/ai-config/upload/${config.id}`)} title="编辑">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUpload(config.id)} title="删除">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
)}
```

其中 `AUTH_TYPE_LABELS`：

```typescript
const AUTH_TYPE_LABELS: Record<string, string> = {
  bearer: "Bearer Token",
  "api-key": "API Key",
  custom: "自定义",
};
```

**Step 2: Commit**

```bash
git add web/src/app/admin/ai-config/page.tsx
git commit -m "feat: add upload config list in ai-config page"
```

---

### Task 6: Admin 页面 — 图片上传配置编辑页

**Files:**
- Create: `web/src/app/admin/ai-config/upload/[id]/page.tsx`

**Step 1: 创建编辑页面**

创建 `web/src/app/admin/ai-config/upload/[id]/page.tsx`，复用现有 ai-config 编辑页的布局风格（Card + LabelWithTooltip + ChipSelector）：

```typescript
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, LabelWithTooltip, ChipSelector } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AuthType = "bearer" | "api-key" | "custom";

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  bearer: "Bearer Token",
  "api-key": "API Key",
  custom: "自定义",
};

interface FormData {
  providerName: string;
  displayName: string;
  uploadUrl: string;
  authType: AuthType;
  apiKey: string;
  responseUrlPath: string;
  config: {
    fileFieldName?: string;
    extraHeaders?: string;
  };
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  providerName: "",
  displayName: "",
  uploadUrl: "",
  authType: "bearer",
  apiKey: "",
  responseUrlPath: "data.url",
  config: { fileFieldName: "file" },
  isActive: true,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UploadConfigEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    if (!isNew) {
      fetchConfig();
    }
  }, [id, isNew]);

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/admin/upload-configs/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const config = data.data;
      setFormData({
        providerName: config.providerName,
        displayName: config.displayName,
        uploadUrl: config.uploadUrl,
        authType: config.authType as AuthType,
        apiKey: config.apiKey,
        responseUrlPath: config.responseUrlPath,
        config: config.config || { fileFieldName: "file" },
        isActive: config.isActive,
      });
    } catch {
      toast.error("获取配置失败");
      router.push("/admin/ai-config");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        config: Object.keys(formData.config).length > 0 ? formData.config : null,
      };

      if (isNew) {
        const res = await fetch("/api/admin/upload-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("创建成功");
      } else {
        const res = await fetch(`/api/admin/upload-configs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("更新成功");
      }
      router.push("/admin/ai-config");
    } catch {
      toast.error(isNew ? "创建失败" : "更新失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "新增图片上传配置" : "编辑图片上传配置"}
        description={isNew ? "配置 AI 供应商的图片上传接口" : `编辑配置：${formData.displayName}`}
        actions={
          <Button variant="outline" onClick={() => router.push("/admin/ai-config")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">基本信息</CardTitle>
            <CardDescription>配置供应商的图片上传接口信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="providerName" tooltip="小写英文标识，需与 AI 模型配置中的供应商名称一致，用于自动匹配">
                  供应商标识 *
                </LabelWithTooltip>
                <Input
                  id="providerName"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  placeholder="如：toapis、kling、runway"
                  required
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="displayName" tooltip="在管理界面中显示的名称，方便识别">
                  显示名称 *
                </LabelWithTooltip>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="如：ToAPIs 图片上传"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <LabelWithTooltip htmlFor="uploadUrl" tooltip="供应商的图片上传接口完整地址，包含协议和路径">
                上传地址 *
              </LabelWithTooltip>
              <Input
                id="uploadUrl"
                value={formData.uploadUrl}
                onChange={(e) => setFormData({ ...formData, uploadUrl: e.target.value })}
                placeholder="https://toapis.com/v1/uploads/images"
                required
              />
            </div>

            <div className="space-y-3">
              <LabelWithTooltip tooltip="不同供应商使用不同的认证方式，Bearer Token 最常见">
                认证方式 *
              </LabelWithTooltip>
              <ChipSelector
                value={formData.authType}
                onChange={(value) => setFormData({ ...formData, authType: value })}
                options={Object.keys(AUTH_TYPE_LABELS) as AuthType[]}
                labels={AUTH_TYPE_LABELS}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="apiKey" tooltip="用于供应商接口认证的 API 密钥，加密存储">
                  API Key *
                </LabelWithTooltip>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  required
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="responseUrlPath" tooltip="用点号分隔的 JSON 路径，从上传响应中提取图片 URL。如 data.url 表示取 response.data.url">
                  响应 URL 路径 *
                </LabelWithTooltip>
                <Input
                  id="responseUrlPath"
                  value={formData.responseUrlPath}
                  onChange={(e) => setFormData({ ...formData, responseUrlPath: e.target.value })}
                  placeholder="data.url"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">启用配置</Label>
            </div>
          </CardContent>
        </Card>

        {/* 高级配置 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">高级配置</CardTitle>
            <CardDescription>大多数情况下保持默认即可</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="fileFieldName" tooltip="上传表单中文件字段的名称，大多数接口使用 file">
                  文件字段名
                </LabelWithTooltip>
                <Input
                  id="fileFieldName"
                  value={formData.config.fileFieldName || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, fileFieldName: e.target.value },
                  })}
                  placeholder="file"
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="extraHeaders" tooltip="JSON 格式的额外 HTTP 请求头，如 {&quot;X-Custom&quot;: &quot;value&quot;}">
                  额外 Headers
                </LabelWithTooltip>
                <Input
                  id="extraHeaders"
                  value={formData.config.extraHeaders || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    config: { ...formData.config, extraHeaders: e.target.value },
                  })}
                  placeholder='{"X-Custom": "value"}'
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/ai-config")} disabled={saving}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isNew ? "创建配置" : "保存修改"}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/app/admin/ai-config/upload/
git commit -m "feat: add upload config edit page"
```

---

### Task 7: 客户端 — SQLite 表 + 数据库函数

**Files:**
- Modify: `client/electron/database.ts`

**Step 1: 在 createTables() 中添加 provider_upload_records 表**

在 `client/electron/database.ts` 的 `createTables()` 函数中，`scene_prompt_cache` 表之后添加：

```typescript
  // 供应商图片上传记录表（缓存本地资源与远程URL的映射）
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_upload_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_resource_hash TEXT NOT NULL,
      local_path TEXT,
      provider_name TEXT NOT NULL,
      remote_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(local_resource_hash, provider_name)
    )
  `);
```

**Step 2: 添加 CRUD 函数**

在 `database.ts` 文件末尾（场景提示词缓存管理之后）添加：

```typescript
// ==================== 供应商上传记录管理 ====================

// 查询上传记录（通过 hash + providerName）
export function getProviderUploadRecord(localResourceHash: string, providerName: string) {
  if (!db) return null;
  try {
    const stmt = db.prepare(
      'SELECT * FROM provider_upload_records WHERE local_resource_hash = ? AND provider_name = ?'
    );
    const row: any = stmt.get(localResourceHash, providerName);
    if (!row) return null;

    return {
      id: row.id,
      localResourceHash: row.local_resource_hash,
      localPath: row.local_path,
      providerName: row.provider_name,
      remoteUrl: row.remote_url,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error getting provider upload record:', error);
    return null;
  }
}

// 保存上传记录
export function saveProviderUploadRecord(record: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO provider_upload_records (
        local_resource_hash, local_path, provider_name, remote_url,
        file_size, mime_type, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.localResourceHash,
      record.localPath || null,
      record.providerName,
      record.remoteUrl,
      record.fileSize || null,
      record.mimeType || null,
      record.expiresAt || null
    );
    return true;
  } catch (error) {
    console.error('Error saving provider upload record:', error);
    return false;
  }
}

// 删除上传记录
export function deleteProviderUploadRecord(localResourceHash: string, providerName: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare(
      'DELETE FROM provider_upload_records WHERE local_resource_hash = ? AND provider_name = ?'
    );
    stmt.run(localResourceHash, providerName);
    return true;
  } catch (error) {
    console.error('Error deleting provider upload record:', error);
    return false;
  }
}
```

**Step 3: Commit**

```bash
git add client/electron/database.ts
git commit -m "feat: add provider_upload_records table and CRUD functions"
```

---

### Task 8: 客户端 — IPC handlers + Preload 桥接 + 类型定义

**Files:**
- Modify: `client/electron/main.ts`
- Modify: `client/electron/preload.ts`
- Modify: `client/src/types/index.ts`

**Step 1: 在 main.ts 中注册 IPC handlers**

在 `client/electron/main.ts` 的 `registerIpcHandlers()` 中，场景提示词缓存 handler 之后添加：

```typescript
  // 供应商上传记录管理
  ipcMain.handle('db:getProviderUploadRecord', async (_, localResourceHash: string, providerName: string) => {
    return getProviderUploadRecord(localResourceHash, providerName);
  });

  ipcMain.handle('db:saveProviderUploadRecord', async (_, record: any) => {
    return saveProviderUploadRecord(record);
  });

  ipcMain.handle('db:deleteProviderUploadRecord', async (_, localResourceHash: string, providerName: string) => {
    return deleteProviderUploadRecord(localResourceHash, providerName);
  });
```

同时在 main.ts 顶部的 import 中添加新函数：

```typescript
import {
  // ... 现有导入 ...
  getProviderUploadRecord,
  saveProviderUploadRecord,
  deleteProviderUploadRecord,
} from './database';
```

**Step 2: 在 preload.ts 中暴露 API**

在 `client/electron/preload.ts` 的 `db` 对象中添加：

```typescript
    // 供应商上传记录管理
    getProviderUploadRecord: (localResourceHash: string, providerName: string) =>
      ipcRenderer.invoke('db:getProviderUploadRecord', localResourceHash, providerName),
    saveProviderUploadRecord: (record: any) =>
      ipcRenderer.invoke('db:saveProviderUploadRecord', record),
    deleteProviderUploadRecord: (localResourceHash: string, providerName: string) =>
      ipcRenderer.invoke('db:deleteProviderUploadRecord', localResourceHash, providerName),
```

**Step 3: 更新 types/index.ts 类型定义**

在 `client/src/types/index.ts` 中添加接口：

```typescript
// 供应商上传记录
export interface ProviderUploadRecord {
  id?: number;
  localResourceHash: string;
  localPath?: string;
  providerName: string;
  remoteUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiresAt?: string;
  createdAt?: string;
}
```

在 `ElectronAPI.db` 接口中添加方法：

```typescript
    // 供应商上传记录管理
    getProviderUploadRecord: (localResourceHash: string, providerName: string) => Promise<ProviderUploadRecord | null>;
    saveProviderUploadRecord: (record: ProviderUploadRecord) => Promise<boolean>;
    deleteProviderUploadRecord: (localResourceHash: string, providerName: string) => Promise<boolean>;
```

**Step 4: Commit**

```bash
git add client/electron/main.ts client/electron/preload.ts client/src/types/index.ts
git commit -m "feat: add provider upload record IPC handlers and type definitions"
```

---

### Task 9: PageHeader 组件支持 description

**Files:**
- Modify: `web/src/components/admin/PageHeader.tsx`

**Step 1: 更新 PageHeader 渲染 description**

当前 `PageHeader` 接受 `description` prop 但未渲染。更新组件使其展示 description：

```typescript
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/components/admin/PageHeader.tsx
git commit -m "fix: render description in PageHeader component"
```

---

### Task 10: 编译 TypeScript + 验证

**Files:**
- Modify: `client/electron/database.js` (编译产物)
- Modify: `client/electron/main.js` (编译产物)
- Modify: `client/electron/preload.js` (编译产物)

**Step 1: 编译客户端 TypeScript**

```bash
cd client && npx tsc -p tsconfig.node.json
```

Expected: 无编译错误。

**Step 2: 验证服务端**

用户自行启动 `pnpm dev` 验证：
- 访问 `/admin/ai-config` 页面能看到 Tab 切换
- "图片上传配置" Tab 显示空列表
- 点击"新增上传配置"跳转到编辑页
- 填写 ToAPIs 配置并保存成功
- 列表中显示新建的配置
- 编辑、删除功能正常

**Step 3: 最终 Commit**

```bash
git add .
git commit -m "feat: complete AI provider upload config feature"
```

---

## 任务依赖关系

```
Task 1 (Prisma 模型)
  ↓
Task 2 (CRUD API) ← Task 3 (加密凭证 API)
  ↓
Task 4 (公共组件 + Tab) → Task 9 (PageHeader description)
  ↓
Task 5 (列表页) → Task 6 (编辑页)
  ↓
Task 7 (客户端 SQLite) → Task 8 (IPC + 类型)
  ↓
Task 10 (编译验证)
```

## 文件变更清单

| 操作 | 文件路径 |
|------|----------|
| Modify | `web/prisma/schema.prisma` |
| Create | `web/src/app/api/admin/upload-configs/route.ts` |
| Create | `web/src/app/api/admin/upload-configs/[id]/route.ts` |
| Create | `web/src/lib/crypto.ts` |
| Create | `web/src/app/api/upload-configs/credential/route.ts` |
| Create | `web/src/components/admin/LabelWithTooltip.tsx` |
| Create | `web/src/components/admin/ChipSelector.tsx` |
| Modify | `web/src/components/admin/index.ts` |
| Modify | `web/src/components/admin/PageHeader.tsx` |
| Modify | `web/src/app/admin/ai-config/page.tsx` |
| Modify | `web/src/app/admin/ai-config/[id]/page.tsx` |
| Create | `web/src/app/admin/ai-config/upload/[id]/page.tsx` |
| Modify | `client/electron/database.ts` |
| Modify | `client/electron/main.ts` |
| Modify | `client/electron/preload.ts` |
| Modify | `client/src/types/index.ts` |
