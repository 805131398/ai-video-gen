# 用户个人中心设计文档

## 概述

实现登录后用户可以查看和编辑个人资料，以及配置自己的 AI 模型信息。

## 功能需求

### 1. 入口方式
- 点击 Header 右侧头像区域 → 弹出下拉菜单
- 下拉菜单包含：
  - 用户信息展示（头像 + 用户名）
  - 「个人资料」链接 → `/profile`
  - 「模型配置」链接 → `/profile/models`
  - 分隔线
  - 「退出登录」按钮

### 2. 个人资料页面 (`/profile`)

**功能：**
- 头像展示和更换（支持上传）
- 基本信息编辑：
  - 用户名：可编辑，2-20 字符
  - 手机号：只读显示，带脱敏（138****0000）
  - 邮箱：可编辑，需验证格式
- 修改密码：折叠面板，展开后显示「当前密码」「新密码」「确认密码」

### 3. 模型配置页面 (`/profile/models`)

**功能：**
- 支持四种模型类型配置：
  - TEXT - 文本生成（如 GPT、Claude）
  - IMAGE - 图片生成（如 DALL-E、Midjourney）
  - VIDEO - 视频生成
  - VOICE - 语音生成（TTS）
- 每种类型可配置多个模型
- 支持设置默认模型
- 支持启用/禁用配置

## 页面结构

```
/profile              - 个人资料页面
/profile/models       - 模型配置页面
```

## 组件结构

```
components/
  user-dropdown.tsx      - 头像下拉菜单组件

app/(main)/profile/
  layout.tsx             - Profile 布局（左侧 Tab 导航）
  page.tsx               - 个人资料页面
  models/
    page.tsx             - 模型配置页面
```

## API 设计

### 用户信息
- `GET /api/profile` - 获取当前用户信息
- `PATCH /api/profile` - 更新用户信息（name, email）
- `PATCH /api/profile/password` - 修改密码

### 模型配置
- `GET /api/profile/models` - 获取用户的模型配置列表
- `POST /api/profile/models` - 创建模型配置
- `PATCH /api/profile/models/[id]` - 更新模型配置
- `DELETE /api/profile/models/[id]` - 删除模型配置

## 数据模型

使用现有的 `AIModelConfig` 表，通过 `userId` 字段区分用户级配置：

```prisma
model AIModelConfig {
  id           String      @id @default(uuid())
  tenantId     String?     @map("tenant_id")
  userId       String?     @map("user_id")      // 用户级配置
  modelType    AIModelType @map("model_type")
  providerName String      @map("provider_name")
  apiUrl       String      @map("api_url")
  apiKey       String      @map("api_key")
  modelName    String      @map("model_name")
  config       Json?
  isDefault    Boolean     @default(false)
  isActive     Boolean     @default(true)
  priority     Int         @default(0)
  // ...
}
```

## 实现状态

- [x] 用户下拉菜单组件
- [x] 修改 main layout 集成下拉菜单
- [x] Profile 布局
- [x] 个人资料页面
- [x] 模型配置页面
- [x] API 路由实现
- [ ] 头像上传功能（预留）

## 文件清单

### 新增文件
- `src/components/user-dropdown.tsx`
- `src/app/(main)/profile/layout.tsx`
- `src/app/(main)/profile/page.tsx`
- `src/app/(main)/profile/models/page.tsx`
- `src/app/api/profile/route.ts`
- `src/app/api/profile/password/route.ts`
- `src/app/api/profile/models/route.ts`
- `src/app/api/profile/models/[id]/route.ts`

### 修改文件
- `src/app/(main)/layout.tsx` - 集成用户下拉菜单

---

## AI 模型配置兼容性设计

### 问题背景

不同 AI 提供商的 API 格式差异较大：
- OpenAI / Azure OpenAI - 标准 OpenAI 格式
- Anthropic (Claude) - 不同的消息格式，system 单独提取
- 通义千问、智谱 AI 等 - 大多提供 OpenAI 兼容接口

### 解决方案：混合配置模式

采用「默认 + 覆盖」的混合方案：
1. 默认使用 OpenAI 格式（大多数情况）
2. 预定义常见格式（anthropic、qwen 等）
3. 支持自定义覆盖特定配置

### config JSON 结构

```typescript
interface AIModelConfigOptions {
  // API 格式类型，默认为 "openai"
  apiFormat?: "openai" | "anthropic" | "qwen" | "zhipu" | "baidu" | "custom";

  // 覆盖默认的 API 端点路径
  endpoint?: string;  // 如 "/v1/messages"

  // 认证头配置
  authHeader?: string;  // 默认 "Authorization"
  authPrefix?: string;  // 默认 "Bearer "

  // 额外请求头
  extraHeaders?: Record<string, string>;

  // 请求体字段映射
  requestMapping?: Record<string, string>;

  // 响应解析路径 (JSONPath 风格)
  responsePath?: string;  // 如 "choices[0].message.content"

  // 默认参数
  defaultParams?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };

  // 是否单独提取 system prompt
  separateSystemPrompt?: boolean;
}
```

### 预定义格式默认值

| 格式 | endpoint | authHeader | responsePath | separateSystemPrompt |
|------|----------|------------|--------------|---------------------|
| openai | /chat/completions | Authorization | choices[0].message.content | false |
| anthropic | /v1/messages | x-api-key | content[0].text | true |
| qwen | /compatible-mode/v1/chat/completions | Authorization | choices[0].message.content | false |

### 使用示例

**场景 1：OpenAI 兼容 API（默认）**
```json
{
  "apiFormat": "openai"
}
```

**场景 2：Anthropic Claude**
```json
{
  "apiFormat": "anthropic"
}
```

**场景 3：自定义 API**
```json
{
  "apiFormat": "custom",
  "endpoint": "/api/chat",
  "responsePath": "data.result.text",
  "defaultParams": {
    "temperature": 0.7,
    "maxTokens": 2000
  }
}
```

### 新增文件

- `src/lib/ai/types.ts` - 配置类型定义和预定义格式
- `src/lib/ai/client.ts` - AI 客户端适配器

### 修改文件

- `src/lib/ai/text-generator.ts` - 使用新的 AI 客户端
- `src/app/(main)/profile/models/page.tsx` - 添加高级配置选项

---

## 多模型类型 AI 客户端设计

### 概述

支持四种模型类型的统一客户端适配器架构：
- **TEXT** - 文本/对话生成（同步请求）
- **IMAGE** - 图片生成（同步或异步）
- **VIDEO** - 视频生成（异步任务模式）
- **VOICE** - 语音合成（同步流式）

### 架构设计

```
src/lib/ai/
├── index.ts           # 统一导出
├── types/
│   └── index.ts       # 所有类型定义
├── client.ts          # TEXT 客户端 (AIClient)
├── image-client.ts    # IMAGE 客户端 (ImageClient)
├── video-client.ts    # VIDEO 客户端 (VideoClient)
├── voice-client.ts    # VOICE 客户端 (VoiceClient)
└── text-generator.ts  # 文本生成服务
```

### 各类型支持的提供商

#### TEXT 类型
| 提供商 | apiFormat | 特点 |
|--------|-----------|------|
| OpenAI | openai | 标准格式 |
| Anthropic | anthropic | system 单独提取 |
| 通义千问 | qwen | OpenAI 兼容 |
| 智谱 AI | zhipu | OpenAI 兼容 |
| 百度文心 | baidu | 特殊响应格式 |

#### IMAGE 类型
| 提供商 | provider | 特点 |
|--------|----------|------|
| DALL-E | openai | 同步，返回 URL |
| Stable Diffusion | stability | 返回 base64 |
| 通义万相 | qwen-image | 异步任务模式 |
| 智谱 CogView | zhipu-image | OpenAI 兼容 |
| fal.ai | fal | 多模型支持 |

#### VIDEO 类型
| 提供商 | provider | 特点 |
|--------|----------|------|
| Sora | sora | OpenAI 官方 |
| Runway | runway | Gen-2/Gen-3 |
| 可灵 | kling | 快手视频生成 |
| 智谱 CogVideo | zhipu-video | 异步任务 |
| fal.ai | fal-video | Sora 2 代理 |

#### VOICE 类型
| 提供商 | provider | 特点 |
|--------|----------|------|
| OpenAI TTS | openai-tts | 流式音频 |
| ElevenLabs | elevenlabs | 高质量语音 |
| Azure TTS | azure-tts | SSML 格式 |
| 阿里云 TTS | aliyun-tts | 返回 URL |
| MiniMax TTS | minimax-tts | 返回 base64 |

### config JSON 结构

#### IMAGE 配置
```typescript
interface ImageConfigOptions {
  provider?: "openai" | "stability" | "qwen-image" | "fal" | "custom";
  defaultSize?: string;      // "1024x1024"
  defaultN?: number;         // 生成数量
  defaultQuality?: "standard" | "hd";
  responseFormat?: "url" | "b64_json";
  async?: boolean;           // 是否异步模式
  taskIdPath?: string;       // 任务 ID 解析路径
  imageUrlPath?: string;     // 图片 URL 解析路径
}
```

#### VIDEO 配置
```typescript
interface VideoConfigOptions {
  provider?: "sora" | "runway" | "kling" | "zhipu-video" | "fal-video";
  defaultDuration?: number;  // 视频时长(秒)
  defaultResolution?: string; // "1080p"
  defaultAspectRatio?: string; // "16:9"
  submitEndpoint?: string;   // 任务提交端点
  statusEndpoint?: string;   // 状态查询端点
  taskIdPath?: string;       // 任务 ID 路径
  videoUrlPath?: string;     // 视频 URL 路径
  pollInterval?: number;     // 轮询间隔(ms)
  maxWaitTime?: number;      // 最大等待时间(ms)
}
```

#### VOICE 配置
```typescript
interface VoiceConfigOptions {
  provider?: "openai-tts" | "elevenlabs" | "azure-tts" | "aliyun-tts";
  defaultVoice?: string;     // 默认音色
  defaultSpeed?: number;     // 语速
  outputFormat?: "mp3" | "wav" | "ogg";
  responseType?: "stream" | "base64" | "url";
  audioDataPath?: string;    // 音频数据路径
}
```

### 使用示例

```typescript
import {
  createAIClient,
  createImageClient,
  createVideoClient,
  createVoiceClient
} from "@/lib/ai";

// TEXT - 文本生成
const textClient = createAIClient(config);
const response = await textClient.generateText("你好", "你是助手");

// IMAGE - 图片生成
const imageClient = createImageClient(config);
const images = await imageClient.generate({ prompt: "一只猫" });

// VIDEO - 视频生成（异步）
const videoClient = createVideoClient(config);
const result = await videoClient.generate(
  { prompt: "日落海滩" },
  (progress) => console.log(progress.status)
);

// VOICE - 语音合成
const voiceClient = createVoiceClient(config);
const audio = await voiceClient.generate({ text: "你好世界" });
```

### 新增文件

- `src/lib/ai/types/index.ts` - 统一类型定义
- `src/lib/ai/image-client.ts` - 图片生成客户端
- `src/lib/ai/video-client.ts` - 视频生成客户端
- `src/lib/ai/voice-client.ts` - 语音合成客户端
- `src/lib/ai/index.ts` - 统一导出
