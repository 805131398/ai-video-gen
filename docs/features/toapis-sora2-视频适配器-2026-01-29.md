# toapis Sora2 视频生成适配器实现

## 概述

为 AI 视频生成平台添加 toapis Sora2 视频生成服务的适配器支持，使用户可以通过 toapis 的 API 生成高质量视频。

## 实现日期

2026-01-29

## API 文档对比

### 1. 提交视频生成任务

**端点**: `POST https://toapis.com/v1/videos/generations`

**认证**: `Authorization: Bearer YOUR_API_KEY`

**请求参数**:
- `model`: "sora-2" 或 "sora-2-pro"
- `prompt`: 文本描述（支持 @username 角色引用）
- `duration`: 10/15 秒 (sora-2) 或 15/25 秒 (sora-2-pro)
- `aspect_ratio`: "16:9" 或 "9:16"
- `image_urls`: 图片 URL 数组（图生视频）
- `thumbnail`: 是否生成缩略图
- `metadata`: 元数据对象
  - `n`: 生成变体数量 (1-4)
  - `watermark`: 是否添加水印
  - `hd`: 是否生成高清视频
  - `private`: 是否启用隐私模式
  - `style`: 视频风格（thanksgiving/comic/news/selfie/nostalgic/anime）
  - `storyboard`: 是否使用故事板功能
  - `character_url`: 角色提取的参考视频 URL
  - `character_timestamps`: 角色出现的时间戳
  - `character_create`: 自动创建角色
  - `character_from_task`: 从任务创建角色

**响应格式**:
```json
{
  "id": "video_01K8SGYNNNVBQTXNR4MM964S7K",
  "object": "generation.task",
  "model": "sora-2",
  "status": "queued|in_progress|completed|failed",
  "progress": 0-100,
  "created_at": 1234567890,
  "metadata": {}
}
```

### 2. 查询任务状态

**端点**: `GET https://toapis.com/v1/videos/generations/{task_id}`

**认证**: `Authorization: Bearer YOUR_API_KEY`

**响应格式**:
```json
{
  "id": "video_01K8SGYNNNVBQTXNR4MM964S7K",
  "object": "generation.task",
  "model": "sora-2",
  "status": "completed",
  "progress": 100,
  "created_at": 1234567890,
  "completed_at": 1234567900,
  "expires_at": 1234654290,
  "result": {
    "data": [
      {
        "url": "https://example.com/video.mp4",
        "format": "mp4",
        "thumbnail_url": "https://example.com/thumbnail.jpg"
      }
    ]
  },
  "error": {
    "message": "错误信息",
    "code": "error_code"
  }
}
```

**状态说明**:
- `queued`: 任务排队等待处理
- `in_progress`: 任务正在处理中
- `completed`: 任务成功完成
- `failed`: 任务处理失败

**轮询策略**:
- 初始等待: 5 秒
- 轮询间隔: 10 秒（推荐）
- 最大等待: 600 秒（10分钟）
- 典型耗时: 1-5 分钟

**视频有效期**:
- 生成的视频 URL 有效期为 24 小时
- `expires_at` 字段标识过期时间（Unix 时间戳）
- 视频过期后无法访问，需重新提交生成任务

## 实现内容

### 1. 类型定义 (`web/src/lib/ai/types/index.ts`)

#### 添加 VideoProvider 类型
```typescript
export type VideoProvider =
  | "sora"
  | "runway"
  | "pika"
  | "kling"
  | "minimax"
  | "zhipu-video"
  | "fal-video"
  | "bltcy"
  | "toapis"           // 新增
  | "custom";
```

#### 添加默认配置
```typescript
toapis: {
  provider: "toapis",
  submitEndpoint: "/v1/videos/generations",
  statusEndpoint: "/v1/videos/generations/{task_id}",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  taskIdPath: "id",
  taskStatusPath: "status",
  videoUrlPath: "result.data[0].url",  // 视频 URL 路径
  pollInterval: 10000,  // 10 秒轮询间隔（推荐）
  maxWaitTime: 600000,  // 最大等待 10 分钟
  defaultDuration: 10,
  defaultAspectRatio: "16:9",
}
```

**配置说明**:
- `taskIdPath`: 任务 ID 在响应中的路径 (`id`)
- `taskStatusPath`: 任务状态在响应中的路径 (`status`)
- `videoUrlPath`: 视频 URL 在响应中的路径 (`result.data[0].url`)
- `pollInterval`: 轮询间隔，根据 API 文档建议设置为 10 秒
- `maxWaitTime`: 最大等待时间 10 分钟

### 2. 视频客户端 (`web/src/lib/ai/video-client.ts`)

#### 添加请求体构建逻辑

在 `buildRequestBody` 方法中添加 toapis 的处理逻辑：

```typescript
case "toapis":
  body.prompt = request.prompt;
  body.model = this.modelName;
  body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
  body.duration = request.duration || this.config.defaultDuration || 10;

  // 图生视频
  if (request.imageUrl) {
    body.image_urls = [request.imageUrl];
  }

  // metadata 参数
  const metadata: Record<string, unknown> = {};

  // 支持的 metadata 字段
  if (this.config.extraHeaders?.n !== undefined) {
    metadata.n = this.config.extraHeaders.n;
  }
  if (this.config.extraHeaders?.watermark !== undefined) {
    metadata.watermark = this.config.extraHeaders.watermark;
  }
  if (this.config.extraHeaders?.hd !== undefined) {
    metadata.hd = this.config.extraHeaders.hd;
  }
  // ... 其他 metadata 字段

  if (Object.keys(metadata).length > 0) {
    body.metadata = metadata;
  }

  // thumbnail 参数
  if (this.config.extraHeaders?.thumbnail !== undefined) {
    body.thumbnail = this.config.extraHeaders.thumbnail;
  }
  break;
```

#### 状态解析和错误处理

在 `parseTaskResult` 方法中添加了对 toapis 响应格式的支持：

```typescript
private parseTaskResult(data: unknown, taskId: string): VideoTaskResult {
  const statusPath = this.config.taskStatusPath || "status";
  const videoUrlPath = this.config.videoUrlPath || "video.url";

  const rawStatus = getByPath(data, statusPath) as string || "processing";
  const status = this.parseTaskStatus(rawStatus);

  // 提取错误消息：支持多种格式
  let message = getByPath(data, "message") as string | undefined;
  if (status === "failed") {
    // 优先级：error.message > fail_reason > message
    const errorMessage = getByPath(data, "error.message") as string | undefined;
    const failReason = getByPath(data, "fail_reason") as string | undefined;
    message = errorMessage || failReason || message || "任务执行失败";
  }

  // 提取缩略图 URL：支持多种路径
  let thumbnailUrl = getByPath(data, "thumbnail_url") as string | undefined;
  if (!thumbnailUrl && status === "completed") {
    // 尝试从 result.data[0].thumbnail_url 获取（toapis 格式）
    thumbnailUrl = getByPath(data, "result.data[0].thumbnail_url") as string | undefined;
  }

  return {
    taskId,
    status,
    progress: getByPath(data, "progress") as number | undefined,
    videoUrl: status === "completed" ? getByPath(data, videoUrlPath) as string : undefined,
    thumbnailUrl,
    duration: getByPath(data, "duration") as number | undefined,
    message,
    raw: data,
  };
}
```

**状态映射**:
- `queued` → `pending`
- `in_progress` → `processing`
- `completed` → `completed`
- `failed` → `failed`

**错误处理**:
- 优先从 `error.message` 提取错误信息（toapis 格式）
- 其次尝试 `fail_reason`（其他提供商格式）
- 最后使用顶层 `message` 或默认错误消息

**缩略图提取**:
- 优先从顶层 `thumbnail_url` 提取
- 其次从 `result.data[0].thumbnail_url` 提取（toapis 格式）

### 3. 管理界面 (`web/src/app/admin/ai-config/[id]/page.tsx`)

#### 更新类型定义
```typescript
type VideoProvider = "sora" | "runway" | "kling" | "zhipu-video" | "fal-video" | "bltcy" | "toapis" | "custom";
```

#### 添加 UI 标签
```typescript
const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  // ...
  toapis: "toapis Sora2",
  // ...
};
```

## 使用示例

### 配置 AI 模型

在管理后台创建 toapis 视频模型配置：

1. **基本信息**:
   - 模型名称: "toapis-sora2"
   - 模型类型: VIDEO
   - API URL: "https://toapis.com"
   - API Key: "your-api-key"
   - 模型标识: "sora-2" 或 "sora-2-pro"

2. **配置选项** (JSON):
```json
{
  "provider": "toapis",
  "defaultDuration": 10,
  "defaultAspectRatio": "16:9",
  "extraHeaders": {
    "watermark": false,
    "hd": true,
    "private": false,
    "thumbnail": true,
    "n": 1
  }
}
```

### 调用示例

```typescript
const videoClient = new VideoClient(
  "https://toapis.com",
  "your-api-key",
  "sora-2",
  {
    provider: "toapis",
    defaultDuration: 10,
    defaultAspectRatio: "16:9",
    extraHeaders: {
      watermark: false,
      hd: true,
      thumbnail: true,
    }
  }
);

// 文本生成视频
const result = await videoClient.submit({
  prompt: "一只猫在草地上奔跑",
  duration: 10,
  aspectRatio: "16:9",
});

// 图生视频
const result2 = await videoClient.submit({
  prompt: "让这张图片动起来",
  imageUrl: "https://example.com/image.jpg",
  duration: 10,
});

// 使用角色引用
const result3 = await videoClient.submit({
  prompt: "一只猫和一只狗一起开车 @duksvfkf.cruisingki @zdqwahgj.baronbarki",
  duration: 10,
});

// 查询任务状态
const status = await videoClient.getStatus(result.taskId);
console.log(`任务状态: ${status.status}, 进度: ${status.progress}%`);

// 等待任务完成（自动轮询）
const completed = await videoClient.waitForCompletion(
  result.taskId,
  (progress) => {
    console.log(`进度更新: ${progress.status} - ${progress.progress}%`);
  }
);
console.log(`视频 URL: ${completed.videoUrl}`);
console.log(`缩略图 URL: ${completed.thumbnailUrl}`);

// 一步完成：提交并等待
const final = await videoClient.generate(
  {
    prompt: "一只猫在草地上奔跑",
    duration: 10,
  },
  (progress) => {
    console.log(`生成进度: ${progress.progress}%`);
  }
);
```

## 特性支持

### 基础功能
- ✅ 文本生成视频
- ✅ 图生视频（image_urls 数组）
- ✅ 自定义时长（10/15/25 秒）
- ✅ 宽高比设置（16:9, 9:16）
- ✅ 异步任务管理
- ✅ 任务状态查询
- ✅ 轮询等待完成

### 高级功能
- ✅ 生成多个变体（metadata.n）
- ✅ 水印控制（metadata.watermark）
- ✅ 高清模式（metadata.hd）
- ✅ 隐私模式（metadata.private）
- ✅ 视频风格（metadata.style）
- ✅ 故事板模式（metadata.storyboard）
- ✅ 角色引用（@username）
- ✅ 角色提取（metadata.character_url）
- ✅ 缩略图生成（thumbnail）

## 与 bltcy 适配器的对比

| 特性 | bltcy | toapis |
|------|-------|--------|
| 端点路径 | `/v2/videos/generations` | `/v1/videos/generations` |
| 图片参数 | `images` 数组 | `image_urls` 数组 |
| 时长参数 | 字符串类型 | 数字类型 |
| 高清参数 | 顶层 `hd` | `metadata.hd` |
| 水印参数 | 顶层 `watermark` | `metadata.watermark` |
| 隐私参数 | 顶层 `private` | `metadata.private` |
| 任务 ID | `task_id` | `id` |
| 视频 URL | `data.output` | `video.url` |
| 角色引用 | ❌ | ✅ @username |
| 故事板 | ❌ | ✅ metadata.storyboard |
| 视频风格 | ❌ | ✅ metadata.style |

## 注意事项

1. **图片上传**: toapis 不再支持 base64 图片，需要先使用上传接口获取 URL
2. **高清限制**: 使用 sora-2-pro 模型且时长不可为 25 秒时才能启用高清
3. **角色时间戳**: 使用角色提取时，生成的视频时长会减少 1 秒
4. **时长限制**:
   - sora-2: 10 或 15 秒
   - sora-2-pro: 15 或 25 秒
5. **变体数量**: metadata.n 取值范围 1-4

## 测试建议

1. 测试基础文本生成视频
2. 测试图生视频功能
3. 测试不同时长和宽高比
4. 测试 metadata 参数（水印、高清、风格等）
5. 测试角色引用功能
6. 测试故事板模式
7. 测试任务状态查询和轮询

## 相关文件

- `web/src/lib/ai/types/index.ts` - 类型定义和默认配置
- `web/src/lib/ai/video-client.ts` - 视频客户端实现
- `web/src/app/admin/ai-config/[id]/page.tsx` - 管理界面
- `docs/features/bltcy视频适配器实现-2026-01-29.md` - bltcy 适配器参考

## 任务状态查询详解

### 状态流转

```
queued (排队) → in_progress (处理中) → completed (完成) / failed (失败)
```

### 轮询策略

根据 toapis API 文档建议：

1. **初始等待**: 提交任务后等待 5 秒再开始查询
2. **轮询间隔**: 每 10 秒查询一次（已在配置中设置）
3. **最大等待**: 最多等待 10 分钟（600 秒）
4. **典型耗时**: 大多数视频生成需要 1-5 分钟

### 响应字段说明

**任务进行中**:
```json
{
  "id": "video_xxx",
  "status": "in_progress",
  "progress": 45,
  "created_at": 1234567890
}
```

**任务完成**:
```json
{
  "id": "video_xxx",
  "status": "completed",
  "progress": 100,
  "created_at": 1234567890,
  "completed_at": 1234567900,
  "expires_at": 1234654290,
  "result": {
    "data": [
      {
        "url": "https://example.com/video.mp4",
        "format": "mp4",
        "thumbnail_url": "https://example.com/thumbnail.jpg"
      }
    ]
  }
}
```

**任务失败**:
```json
{
  "id": "video_xxx",
  "status": "failed",
  "progress": 0,
  "created_at": 1234567890,
  "error": {
    "message": "内容违规",
    "code": "content_policy_violation"
  }
}
```

### 视频有效期管理

- **有效期**: 生成的视频 URL 有效期为 24 小时
- **过期时间**: 通过 `expires_at` 字段获取（Unix 时间戳）
- **建议**: 及时下载并保存到自己的存储服务
- **过期后**: 无法访问，需重新提交生成任务

### 错误处理

常见错误码：

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数无效 | 检查请求参数格式 |
| 401 | 认证失败 | 检查 API Key 是否正确 |
| 402 | 余额不足 | 充值账户余额 |
| 404 | 任务不存在 | 检查任务 ID 是否正确 |
| 422 | 内容违规 | 修改提示词，避免违规内容 |
| 429 | 请求频率超限 | 降低请求频率 |
| 500 | 服务器内部错误 | 稍后重试 |

## 注意事项

1. **图片上传**: toapis 不再支持 base64 图片，需要先使用上传接口获取 URL
2. **高清限制**: 使用 sora-2-pro 模型且时长不可为 25 秒时才能启用高清
3. **角色时间戳**: 使用角色提取时，生成的视频时长会减少 1 秒
4. **时长限制**:
   - sora-2: 10 或 15 秒
   - sora-2-pro: 15 或 25 秒
5. **变体数量**: metadata.n 取值范围 1-4
6. **轮询频率**: 建议使用 10 秒间隔，避免浪费请求配额
7. **视频保存**: 视频 24 小时后过期，务必及时下载保存

## 测试建议

1. 测试基础文本生成视频
2. 测试图生视频功能
3. 测试不同时长和宽高比
4. 测试 metadata 参数（水印、高清、风格等）
5. 测试角色引用功能
6. 测试故事板模式
7. 测试任务状态查询和轮询
8. 测试错误处理（无效参数、内容违规等）
9. 测试视频 URL 有效期
10. 测试缩略图生成

## 相关文件

- `web/src/lib/ai/types/index.ts` - 类型定义和默认配置
- `web/src/lib/ai/video-client.ts` - 视频客户端实现
- `web/src/app/admin/ai-config/[id]/page.tsx` - 管理界面
- `docs/features/bltcy视频适配器实现-2026-01-29.md` - bltcy 适配器参考

## 后续优化

1. 添加角色管理功能，支持查询和引用已创建的角色
2. 添加故事板编辑器，可视化配置故事板参数
3. 支持批量生成多个变体
4. 添加视频风格预设模板
5. 集成角色提取和自动创建功能
