# Wan2.6（阿里云万相）视频生成适配器实现

## 概述

为 AI 视频生成平台添加阿里云万相 Wan2.6 视频生成服务的适配器支持，支持文生视频和图生视频两种模式。

## 实现日期

2026-01-29

## API 文档对比

### 1. 提交视频生成任务

**端点**: `POST https://toapis.com/v1/videos/generations`

**认证**: `Authorization: Bearer YOUR_API_KEY`

**请求参数**:

#### 基础参数
- `model`: "wan2.6"（固定值）
- `prompt`: 视频内容描述（必填）
- `image_urls`: 参考图片 URL 数组（仅支持1张图片，图生视频模式）

#### 视频设置
- `aspect_ratio`: 16:9, 9:16, 1:1, 4:3, 3:4（默认16:9）
- `resolution`: 720p, 1080p（默认720p）
- `duration`: 5, 10, 15秒（默认5）

#### 高级参数
- `negative_prompt`: 负面提示词
- `seed`: 随机种子
- `prompt_extend`: 是否自动扩展提示词
- `audio`: 是否自动添加音频
- `audio_url`: 指定音频 URL
- `shot_type`: single/multi（镜头类型）
- `watermark`: 是否添加水印
- `template`: 特效模板名称（图生视频特效模式）

**响应格式**:
```json
{
  "id": "video_01K8SGYNNNVBQTXNR4MM964S7K",
  "object": "generation.task",
  "model": "wan2.6",
  "status": "queued|in_progress|completed|failed",
  "progress": 0-100,
  "created_at": 1234567890,
  "metadata": {}
}
```

### 2. 查询任务状态

**端点**: `GET https://toapis.com/v1/videos/generations/{task_id}`

**认证**: `Authorization: Bearer YOUR_API_KEY`

**响应格式**: 与 toapis Sora2 相同

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
  | "toapis"
  | "wan2.6"           // 新增
  | "custom";
```

#### 添加默认配置
```typescript
"wan2.6": {
  provider: "wan2.6",
  submitEndpoint: "/v1/videos/generations",
  statusEndpoint: "/v1/videos/generations/{task_id}",
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  taskIdPath: "id",
  taskStatusPath: "status",
  videoUrlPath: "result.data[0].url",
  pollInterval: 10000,  // 10 秒轮询间隔
  maxWaitTime: 600000,  // 最大等待 10 分钟
  defaultDuration: 5,
  defaultResolution: "720p",
  defaultAspectRatio: "16:9",
}
```

### 2. 视频客户端 (`web/src/lib/ai/video-client.ts`)

#### 添加请求体构建逻辑

```typescript
case "wan2.6":
  body.prompt = request.prompt;
  body.model = this.modelName;
  body.aspect_ratio = request.aspectRatio || this.config.defaultAspectRatio || "16:9";
  body.resolution = request.resolution || this.config.defaultResolution || "720p";
  body.duration = request.duration || this.config.defaultDuration || 5;

  // 图生视频：如果提供了图片 URL，使用 image_urls 数组（仅支持1张图片）
  if (request.imageUrl) {
    body.image_urls = [request.imageUrl];
  }

  // negative_prompt: 负面提示词
  if (request.negativePrompt || this.config.extraHeaders?.negative_prompt) {
    body.negative_prompt = request.negativePrompt || this.config.extraHeaders?.negative_prompt;
  }

  // seed: 随机种子
  if (this.config.extraHeaders?.seed !== undefined) {
    body.seed = this.config.extraHeaders.seed;
  }

  // prompt_extend: 是否自动扩展提示词
  if (this.config.extraHeaders?.prompt_extend !== undefined) {
    body.prompt_extend = this.config.extraHeaders.prompt_extend;
  }

  // audio: 是否自动添加音频
  if (this.config.extraHeaders?.audio !== undefined) {
    body.audio = this.config.extraHeaders.audio;
  }

  // audio_url: 指定音频 URL
  if (this.config.extraHeaders?.audio_url) {
    body.audio_url = this.config.extraHeaders.audio_url;
  }

  // shot_type: 镜头类型
  if (this.config.extraHeaders?.shot_type) {
    body.shot_type = this.config.extraHeaders.shot_type;
  }

  // watermark: 是否添加水印
  if (this.config.extraHeaders?.watermark !== undefined) {
    body.watermark = this.config.extraHeaders.watermark;
  }

  // template: 特效模板（图生视频特效模式）
  if (this.config.extraHeaders?.template) {
    body.template = this.config.extraHeaders.template;
  }
  break;
```

### 3. 管理界面 (`web/src/app/admin/ai-config/[id]/page.tsx`)

#### 更新类型定义
```typescript
type VideoProvider = "sora" | "runway" | "kling" | "zhipu-video" | "fal-video" | "bltcy" | "toapis" | "wan2.6" | "custom";
```

#### 添加 UI 标签
```typescript
const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  // ...
  "wan2.6": "阿里云万相 Wan2.6",
  // ...
};
```

## 使用示例

### 配置 AI 模型

在管理后台创建 Wan2.6 视频模型配置：

1. **基本信息**:
   - 模型名称: "wan2.6-video"
   - 模型类型: VIDEO
   - API URL: "https://toapis.com"
   - API Key: "your-api-key"
   - 模型标识: "wan2.6"

2. **配置选项** (JSON):
```json
{
  "provider": "wan2.6",
  "defaultDuration": 5,
  "defaultResolution": "720p",
  "defaultAspectRatio": "16:9",
  "extraHeaders": {
    "prompt_extend": true,
    "audio": false,
    "shot_type": "single",
    "watermark": false
  }
}
```

### 调用示例

#### 文生视频（简单）
```typescript
const videoClient = new VideoClient(
  "https://toapis.com",
  "your-api-key",
  "wan2.6",
  {
    provider: "wan2.6",
    defaultDuration: 5,
    defaultResolution: "720p",
  }
);

const result = await videoClient.submit({
  prompt: "一只可爱的猫咪在阳光下伸懒腰",
  duration: 5,
  aspectRatio: "16:9",
});
```

#### 文生视频（完整参数）
```typescript
const result = await videoClient.submit({
  prompt: "一只可爱的猫咪在草地上奔跑",
  negativePrompt: "模糊, 低质量, 变形",
  duration: 10,
  aspectRatio: "16:9",
});
```

#### 图生视频
```typescript
const result = await videoClient.submit({
  prompt: "小猫在地上跑步",
  imageUrl: "https://example.com/cat.jpg",
  duration: 10,
});
```

#### 图生视频（特效模式）
```typescript
const videoClient = new VideoClient(
  "https://toapis.com",
  "your-api-key",
  "wan2.6",
  {
    provider: "wan2.6",
    extraHeaders: {
      template: "squish",  // 解压捏捏特效
    }
  }
);

const result = await videoClient.submit({
  prompt: "",  // 特效模式不需要 prompt
  imageUrl: "https://example.com/image.jpg",
  duration: 5,
});
```

## 特性支持

### 基础功能
- ✅ 文生视频 (Text-to-Video)
- ✅ 图生视频 (Image-to-Video)
- ✅ 自定义时长（5/10/15 秒）
- ✅ 分辨率设置（720p/1080p）
- ✅ 宽高比设置（16:9, 9:16, 1:1, 4:3, 3:4）
- ✅ 异步任务管理
- ✅ 任务状态查询
- ✅ 轮询等待完成

### 高级功能
- ✅ 负面提示词（negative_prompt）
- ✅ 随机种子（seed）
- ✅ 自动扩展提示词（prompt_extend）
- ✅ 自动添加音频（audio）
- ✅ 指定音频 URL（audio_url）
- ✅ 镜头类型（shot_type: single/multi）
- ✅ 水印控制（watermark）
- ✅ 特效模板（template）

## 两种模式对比

### 文生视频 (Text-to-Video)

**特点**：
- 必须提供 `prompt` 参数
- 不需要 `image_urls` 参数
- 支持所有宽高比选项

**示例**：
```json
{
  "model": "wan2.6",
  "prompt": "一只可爱的猫咪在阳光下伸懒腰",
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "duration": 5
}
```

### 图生视频 (Image-to-Video)

**特点**：
- 必须提供 `image_urls` 参数（仅支持1张图片）
- `prompt` 参数可选，用于描述期望的动作
- 图生视频模式不支持 `aspect_ratio` 参数（自动匹配图片比例）

**示例**：
```json
{
  "model": "wan2.6",
  "prompt": "小猫在地上跑步",
  "image_urls": ["https://example.com/cat.jpg"],
  "resolution": "1080p",
  "duration": 10
}
```

### 图生视频（特效模式）

**特点**：
- 必须提供 `image_urls` 参数（仅支持1张图片）
- 必须提供 `template` 参数
- 不需要 `prompt` 参数（模型会忽略）

**支持的特效模板**：

**通用特效**：
- `squish` - 解压捏捏
- `rotation` - 转圈圈
- `poke` - 戳戳乐
- `inflate` - 气球膨胀
- `dissolve` - 分子扩散
- `melt` - 热浪融化
- `icecream` - 冰淇淋星球
- `flying` - 魔法悬浮

**单人特效**：
- `carousel` - 时光木马
- `singleheart` - 爱你哟
- `dance1` - 摇摆时刻
- `dance2` - 头号甩舞

**示例**：
```json
{
  "model": "wan2.6",
  "image_urls": ["https://example.com/person.jpg"],
  "template": "squish",
  "duration": 5
}
```

## 分辨率与宽高比组合

| 宽高比 | 说明 | 720p 尺寸 | 1080p 尺寸 |
|--------|------|-----------|------------|
| 16:9 | 横屏（默认） | 1280×720 | 1920×1080 |
| 9:16 | 竖屏 | 720×1280 | 1080×1920 |
| 1:1 | 方形 | 960×960 | 1440×1440 |
| 4:3 | 横屏 | 1088×832 | 1632×1248 |
| 3:4 | 竖屏 | 832×1088 | 1248×1632 |

## 与其他适配器的对比

| 特性 | Wan2.6 | toapis Sora2 | bltcy |
|------|--------|--------------|-------|
| 端点路径 | `/v1/videos/generations` | `/v1/videos/generations` | `/v2/videos/generations` |
| 文生视频 | ✅ | ✅ | ✅ |
| 图生视频 | ✅ | ✅ | ✅ |
| 时长选项 | 5/10/15秒 | 10/15/25秒 | 10/15秒 |
| 分辨率 | 720p/1080p | 自动 | 720p/1080p |
| 负面提示词 | ✅ | ❌ | ❌ |
| 自动扩展提示词 | ✅ | ❌ | ❌ |
| 自动添加音频 | ✅ | ❌ | ❌ |
| 特效模板 | ✅ | ❌ | ❌ |
| 镜头类型 | ✅ | ❌ | ❌ |
| 角色引用 | ❌ | ✅ | ❌ |
| 故事板模式 | ❌ | ✅ | ❌ |

## 场景生成视频适配

Wan2.6 适配器已自动集成到场景生成视频功能中：

1. **自动模式选择**：
   - 如果场景有角色形象图，自动使用图生视频模式
   - 否则使用文生视频模式

2. **参数映射**：
   - 场景的 `duration` → Wan2.6 的 `duration`（自动调整为 5/10/15）
   - 场景的 `prompt` → Wan2.6 的 `prompt`
   - 角色形象图 → Wan2.6 的 `image_urls[0]`

3. **时长调整**：
   - ≤7秒 → 5秒
   - 8-12秒 → 10秒
   - ≥13秒 → 15秒

## 注意事项

1. **图片格式**：不再支持 base64 图片，需要先上传获取 URL
2. **图片数量**：图生视频模式仅支持 1 张图片
3. **宽高比限制**：图生视频模式不支持 `aspect_ratio` 参数
4. **音频时长**：音频时长不能超过视频时长
5. **特效模式**：使用特效模板时不需要提供 `prompt`
6. **分辨率限制**：不支持 480p 分辨率

## 测试建议

1. 测试文生视频（基础参数）
2. 测试文生视频（完整参数：负面提示词、自动扩展等）
3. 测试图生视频（普通模式）
4. 测试图生视频（特效模式）
5. 测试不同时长和分辨率组合
6. 测试自动添加音频功能
7. 测试场景生成视频集成

## 相关文件

- `web/src/lib/ai/types/index.ts` - 类型定义和默认配置
- `web/src/lib/ai/video-client.ts` - 视频客户端实现
- `web/src/app/admin/ai-config/[id]/page.tsx` - 管理界面
- `docs/features/toapis-sora2-视频适配器-2026-01-29.md` - toapis 适配器参考

## 后续优化

1. 添加特效模板选择器，可视化选择特效
2. 支持音频上传和管理
3. 添加负面提示词预设模板
4. 支持批量生成不同特效的视频
5. 集成音频生成服务，自动为视频配音
