# AI 图片生成按钮逻辑流程

## 概述

本文档详细说明了图片选择页面 (`/projects/[projectId]/images`) 中 AI 生成按钮的完整工作流程，包括前端交互、后端处理、AI 调用和状态管理。

## 页面位置

- **路由**: `/projects/[projectId]/images`
- **文件**: `web/src/app/(main)/projects/[projectId]/images/page.tsx`
- **API 路由**: `web/src/app/api/projects/[id]/steps/images/generate/route.ts`
- **AI 服务**: `web/src/lib/ai/image-generator.ts`

---

## 一、前端流程

### 1.1 按钮渲染

**位置**: `page.tsx:485-496`

```tsx
<Button
  variant="outline"
  onClick={handleGenerate}
  disabled={isLoading || isBackgroundGenerating}
>
  {(isGenerating || isBackgroundGenerating) ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <Sparkles className="w-4 h-4 mr-2" />
  )}
  {isBackgroundGenerating ? "生成中..." : "AI 生成"}
</Button>
```

**按钮状态**:
- 正常状态: 显示 "AI 生成" + Sparkles 图标
- 生成中: 显示 "生成中..." + 旋转的 Loader 图标
- 禁用条件: `isLoading || isBackgroundGenerating`

### 1.2 点击事件处理

**函数**: `handleGenerate` (`page.tsx:293-323`)

**执行步骤**:

1. **设置状态**
   ```typescript
   setIsGenerating(true);
   setError(null);
   ```

2. **发送 POST 请求**
   ```typescript
   const res = await fetch(`/api/projects/${projectId}/steps/images/generate`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ action: "generate", count: 4 }),
   });
   ```
   - 默认生成 4 张图片
   - 异步请求，不等待图片生成完成

3. **处理响应**
   ```typescript
   const data = await res.json();
   if (data.batchId) {
     setCurrentBatchId(data.batchId);  // 保存批次 ID
   }
   await mutate();  // 刷新项目数据
   ```

4. **错误处理**
   ```typescript
   catch (err) {
     setError(err.message);
   } finally {
     setIsGenerating(false);
   }
   ```

### 1.3 状态轮询机制

**位置**: `page.tsx:265-275`

```typescript
const imagesStatus = project?.steps?.images?.status;
const isBackgroundGenerating = imagesStatus === "GENERATING";

// 当后台正在生成时，启用轮询
useProject(projectId, {
  refreshInterval: isBackgroundGenerating ? 3000 : 0,
});
```

**轮询逻辑**:
- 检查步骤状态是否为 `GENERATING`
- 如果是，每 3 秒刷新一次项目数据
- 生成完成后自动停止轮询

### 1.4 生成状态提示

**位置**: `page.tsx:432-451`

```tsx
{isBackgroundGenerating && (
  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center gap-3">
      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      <div>
        <p className="text-sm font-medium text-blue-900">正在生成图片...</p>
        <p className="text-xs text-blue-600">图片生成需要一些时间，完成后会自动显示</p>
      </div>
    </div>
    <Button onClick={handleCancelGenerate}>取消</Button>
  </div>
)}
```

### 1.5 取消生成

**函数**: `handleCancelGenerate` (`page.tsx:326-337`)

```typescript
const handleCancelGenerate = async () => {
  await fetch(
    `/api/projects/${projectId}/steps/images/generate?batchId=${currentBatchId}`,
    { method: "DELETE" }
  );
  setCurrentBatchId(null);
  await mutate();
};
```

---

## 二、后端 API 流程

### 2.1 API 端点

**路由**: `POST /api/projects/[id]/steps/images/generate`

**文件**: `web/src/app/api/projects/[id]/steps/images/generate/route.ts`

### 2.2 请求处理流程

#### 步骤 1: 身份验证

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "未授权" }, { status: 401 });
}
```

#### 步骤 2: 验证项目归属

```typescript
const project = await prisma.project.findFirst({
  where: { id: projectId, userId: session.user.id },
  include: { versions: { where: { isMain: true }, take: 1 } },
});
```

#### 步骤 3: 获取文案内容

```typescript
const copyStep = await prisma.projectStep.findFirst({
  where: { versionId, stepType: "COPY_SELECT" },
  include: { options: { where: { isSelected: true } } },
});

const copyContent = copyStep?.options[0]?.content || project.topic;
```

**说明**: 使用已选中的文案内容作为图片生成的基础，如果没有则使用项目主题

#### 步骤 4: 创建/更新图片步骤

```typescript
const imageStep = await prisma.projectStep.upsert({
  where: {
    versionId_stepType: { versionId, stepType: "IMAGE_SELECT" },
  },
  create: {
    versionId,
    stepType: "IMAGE_SELECT",
    status: StepStatus.GENERATING,
  },
  update: {
    status: StepStatus.GENERATING,
  },
});
```

**状态变更**: `COMPLETED` → `GENERATING`

#### 步骤 5: 创建批次 ID

```typescript
const batchId = randomUUID();
const batchStartTime = new Date().toISOString();
runningTasks.set(batchId, { cancelled: false });
```

**说明**:
- 生成唯一批次 ID 用于追踪
- 注册到内存任务表，支持取消功能

#### 步骤 6: 启动异步生成

```typescript
generateImagesAsync(
  copyContent,
  count,
  session.user.id,
  imageStep.id,
  baseSortOrder,
  batchId,
  batchStartTime
);

// 立即返回，不等待生成完成
return NextResponse.json({
  success: true,
  status: "generating",
  batchId,
  message: "图片正在生成中，请稍后刷新查看",
});
```

**关键点**:
- 异步执行，不阻塞请求
- 立即返回响应给前端
- 前端通过轮询获取生成进度

---

## 三、异步图片生成流程

### 3.1 函数入口

**函数**: `generateImagesAsync` (`route.ts:164-260`)

**参数**:
- `copyContent`: 文案内容
- `count`: 生成数量 (默认 4)
- `userId`: 用户 ID
- `stepId`: 步骤 ID
- `baseSortOrder`: 排序基数
- `batchId`: 批次 ID
- `batchStartTime`: 批次开始时间

### 3.2 生成图片提示词

```typescript
const imagePrompt = await generateImagePromptFromCopy(
  copyContent,
  undefined,
  userId,
  undefined
);
```

**调用**: `image-generator.ts:359-423`

**简要说明**: 使用文本生成 AI 将中文文案转换为适合图片生成的英文提示词

**详细流程见**: [四、提示词生成详解](#四提示词生成详解)

### 3.3 逐张生成图片

```typescript
for (let i = 0; i < count; i++) {
  // 检查是否取消
  if (runningTasks.get(batchId)?.cancelled) {
    break;
  }

  // 生成单张图片
  const image = await generateSingleImage(
    { prompt: imagePrompt },
    userId,
    undefined
  );

  // 立即保存到数据库
  if (image) {
    await prisma.stepOption.create({
      data: {
        stepId,
        assetUrl: image.imageUrl,
        metadata: {
          source: "ai",
          prompt: imagePrompt,
          revisedPrompt: image.revisedPrompt,
          model: image.metadata?.model,
          size: image.metadata?.size,
          batchId,
          batchStartTime,
          generatedAt: new Date().toISOString(),
        },
        sortOrder: baseSortOrder + i,
      },
    });
    generatedCount++;
  }
}
```

**关键特性**:
- **逐张生成**: 每生成一张立即保存，不等待全部完成
- **实时可见**: 前端轮询可以看到逐步增加的图片
- **可取消**: 每次循环检查取消标志
- **容错性**: 单张失败不影响其他图片生成

### 3.4 更新步骤状态

```typescript
// 生成完成
await prisma.projectStep.update({
  where: { id: stepId },
  data: { status: StepStatus.COMPLETED },
});

// 清理任务记录
runningTasks.delete(batchId);
```

**状态变更**: `GENERATING` → `COMPLETED`

---

## 四、提示词生成详解

### 4.1 概述

提示词生成是图片生成流程中的关键步骤，负责将用户的中文文案转换为适合 AI 图片生成模型的英文提示词。这个过程使用文本生成 AI（如 GPT）来完成语言转换和视觉化描述优化。

### 4.2 触发时机

**位置**: `route.ts:186-192` (异步生成函数中)

```typescript
// 在开始生成图片之前，首先生成提示词
const imagePrompt = await generateImagePromptFromCopy(
  copyContent,      // 用户选中的文案内容
  undefined,        // 风格（可选）
  userId,           // 用户 ID
  undefined         // 租户 ID（可选）
);
```

**时机**: 在异步图片生成任务中，生成第一张图片之前

### 4.3 函数实现

**函数**: `generateImagePromptFromCopy` (`image-generator.ts:359-423`)

**函数签名**:
```typescript
export async function generateImagePromptFromCopy(
  copywriting: string,  // 文案内容（中文）
  style?: string,       // 风格要求（可选）
  userId?: string,      // 用户 ID
  tenantId?: string     // 租户 ID
): Promise<string>      // 返回英文提示词
```

### 4.4 执行流程

#### 步骤 1: 获取文本生成 AI 配置

```typescript
const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

if (!config) {
  throw new Error("未找到可用的文本生成 AI 配置");
}
```

**说明**:
- 使用 `AIModelType.TEXT` 类型的配置（不是 IMAGE 类型）
- 获取用户或租户级别的有效配置
- 配置包含: `apiUrl`, `apiKey`, `modelName`

**典型配置**:
- 模型: GPT-4, GPT-3.5-turbo, Claude, 等
- API: OpenAI 兼容的 Chat Completions 端点

#### 步骤 2: 构建系统提示词

```typescript
const systemPrompt = `你是一个专业的 AI 图片提示词专家。请根据用户提供的短视频文案，生成适合的图片生成提示词。
要求：
- 提示词要用英文
- 描述要具体、视觉化
- 适合生成短视频配图
- 只输出提示词，不要其他内容
${style ? `\n风格要求：${style}` : ""}`;
```

**系统提示词设计要点**:

1. **角色定位**: "AI 图片提示词专家"
   - 明确 AI 的专业角色
   - 聚焦于提示词生成任务

2. **任务描述**: "根据短视频文案生成图片提示词"
   - 明确输入（文案）和输出（提示词）
   - 强调应用场景（短视频配图）

3. **核心要求**:
   - **英文输出**: 因为大多数图片生成模型对英文提示词效果更好
   - **具体化**: 避免抽象描述，要有具体的视觉元素
   - **视觉化**: 强调可视化的场景、物体、色彩等
   - **纯净输出**: 只输出提示词，不要解释或其他内容

4. **可选风格**: 如果提供了风格参数，会追加到系统提示词中
   - 例如: "风格要求：赛博朋克"
   - 例如: "风格要求：水彩画风格"

#### 步骤 3: 调用文本生成 API

```typescript
const response = await fetch(config.apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  },
  body: JSON.stringify({
    model: config.modelName,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: copywriting }
    ],
    temperature: 0.7,
  }),
});
```

**请求参数说明**:

- **model**: 使用配置中的模型名称
  - 例如: `gpt-4`, `gpt-3.5-turbo`, `claude-3-sonnet`

- **messages**: 标准的 Chat Completions 格式
  - `system`: 系统提示词，定义 AI 的角色和任务
  - `user`: 用户输入，即文案内容

- **temperature**: 0.7
  - 中等创造性，平衡稳定性和多样性
  - 不会太保守（0.0），也不会太随机（1.0）

#### 步骤 4: 解析响应

```typescript
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`API error: ${response.status} - ${errorText}`);
}

const data = await response.json();
return data.choices[0]?.message?.content || "";
```

**响应格式** (OpenAI 标准):
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "A serene landscape with mountains..."
      }
    }
  ]
}
```

**返回值**: 提取 `choices[0].message.content`，即生成的英文提示词

### 4.5 示例转换

#### 示例 1: 科技主题

**输入文案**:
```
探索人工智能的未来，科技改变生活，让我们一起见证智能时代的到来。
```

**生成的提示词** (示例):
```
A futuristic cityscape with holographic displays and AI robots,
neon lights illuminating sleek skyscrapers, people interacting
with advanced technology, cyberpunk aesthetic, high-tech atmosphere,
digital art style, vibrant blue and purple color scheme
```

#### 示例 2: 自然风光

**输入文案**:
```
清晨的阳光洒在湖面上，微风吹过，泛起层层涟漪，大自然的美景让人心旷神怡。
```

**生成的提示词** (示例):
```
Serene lake at sunrise, golden sunlight reflecting on calm water surface,
gentle ripples spreading across the lake, surrounded by lush green trees,
misty morning atmosphere, peaceful natural scenery, soft warm lighting,
photorealistic landscape photography style
```

#### 示例 3: 美食主题

**输入文案**:
```
香气扑鼻的咖啡，搭配精致的甜点，享受悠闲的下午茶时光。
```

**生成的提示词** (示例):
```
Elegant afternoon tea setup, steaming cup of aromatic coffee,
delicate pastries and desserts on fine china, cozy cafe ambiance,
warm natural lighting from window, shallow depth of field,
food photography style, inviting and appetizing presentation
```

### 4.6 提示词质量要素

生成的提示词通常包含以下元素:

1. **主体描述** (Subject)
   - 核心内容: 人物、物体、场景
   - 例如: "A futuristic cityscape", "Serene lake"

2. **细节描述** (Details)
   - 具体特征: 颜色、材质、状态
   - 例如: "golden sunlight", "neon lights"

3. **环境氛围** (Atmosphere)
   - 整体感觉: 氛围、情绪、时间
   - 例如: "peaceful", "high-tech atmosphere"

4. **视觉风格** (Style)
   - 艺术风格: 摄影、绘画、数字艺术
   - 例如: "photorealistic", "digital art style"

5. **技术参数** (Technical)
   - 摄影术语: 光照、景深、构图
   - 例如: "soft warm lighting", "shallow depth of field"

6. **色彩方案** (Color Scheme)
   - 主色调: 配色方案
   - 例如: "vibrant blue and purple", "warm tones"

### 4.7 错误处理

```typescript
if (!response.ok) {
  const errorText = await response.text();
  console.error("[generateImagePromptFromCopy] API 错误:", {
    status: response.status,
    statusText: response.statusText,
    errorText,
  });
  throw new Error(`API error: ${response.status} - ${errorText}`);
}
```

**错误场景**:
- API 密钥无效: 401 Unauthorized
- 配额超限: 429 Too Many Requests
- 模型不存在: 404 Not Found
- 请求格式错误: 400 Bad Request

**处理策略**:
- 记录详细错误日志
- 抛出异常，由上层处理
- 上层会将步骤状态设为 FAILED

### 4.8 性能考虑

**响应时间**:
- 通常: 2-5 秒
- 取决于: 模型速度、API 延迟、文案长度

**成本优化**:
- 使用较快的模型（如 GPT-3.5-turbo）
- 提示词生成只需一次，可以复用于多张图片
- 考虑缓存相同文案的提示词

### 4.9 提示词复用

**关键设计**: 一次生成，多次使用

```typescript
// 生成一次提示词
const imagePrompt = await generateImagePromptFromCopy(copyContent, ...);

// 用于生成多张图片
for (let i = 0; i < count; i++) {
  const image = await generateSingleImage(
    { prompt: imagePrompt },  // 复用同一个提示词
    userId,
    undefined
  );
}
```

**优势**:
- 减少 API 调用次数
- 降低成本
- 保持图片风格一致性
- 加快整体生成速度

### 4.10 日志记录

```typescript
console.log("[generateImagePromptFromCopy] 开始生成图片提示词", {
  copywriting: copywriting?.substring(0, 50),
  style,
  userId,
  tenantId,
});

console.log("[generateImagePromptFromCopy] AI 配置:", {
  hasConfig: !!config,
  apiUrl: config?.apiUrl,
  modelName: config?.modelName,
  hasApiKey: !!config?.apiKey,
});

console.log("[generateImagePromptFromCopy] 请求 URL:", config.apiUrl);
```

**日志内容**:
- 输入参数（文案前 50 字符）
- AI 配置信息
- API 请求 URL
- 错误详情（如果失败）

**用途**:
- 调试问题
- 监控性能
- 审计 API 使用

---

## 五、AI 图片生成服务

### 5.1 服务入口

**函数**: `generateSingleImage` (`image-generator.ts:211-264`)

### 5.2 获取 AI 配置

```typescript
const config = await getEffectiveAIConfig(AIModelType.IMAGE, userId, tenantId);
```

**配置内容**:
- `apiUrl`: API 端点
- `apiKey`: API 密钥
- `modelName`: 模型名称
- `providerName`: 服务商名称

### 5.3 服务商适配

系统支持两种 API 格式:

#### 5.3.1 标准 DALL-E API

**端点**: `/v1/images/generations`

**请求格式**:
```json
{
  "model": "dall-e-3",
  "prompt": "...",
  "n": 1,
  "size": "1024x1024",
  "style": "vivid",
  "response_format": "url"
}
```

**响应格式**:
```json
{
  "data": [
    {
      "url": "https://...",
      "revised_prompt": "..."
    }
  ]
}
```

#### 5.3.2 bltcy Chat Completions 格式

**识别方式**:
- `providerName === "bltcy"`
- `apiUrl.includes("api.bltcy.ai")`

**端点**: `/v1/chat/completions`

**请求格式**:
```json
{
  "model": "flux-1.1-pro",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": "..."
    }
  ]
}
```

**响应格式**:
```json
{
  "choices": [
    {
      "message": {
        "content": "![](https://...)" // Markdown 格式或纯 URL
      }
    }
  ]
}
```

**特殊处理**:
- 每次只能生成 1 张图片
- 需要从 `content` 中提取图片 URL
- 支持 Markdown 格式: `![](url)`
- 支持纯 URL 格式
- 超时时间: 120 秒

### 5.4 URL 提取逻辑

**函数**: `extractImageUrls` (`image-generator.ts:179-206`)

**提取顺序**:
1. Markdown 格式: `![...](https://...)`
2. 图片 URL 格式: `https://....(png|jpg|jpeg|gif|webp|bmp)`
3. 纯 URL: 以 `http` 开头的完整 URL

---

## 六、数据库结构

### 6.1 ProjectStep 表

```prisma
model ProjectStep {
  id         String     @id @default(uuid())
  versionId  String
  stepType   StepType   // IMAGE_SELECT
  status     StepStatus // GENERATING | COMPLETED | FAILED
  options    StepOption[]
  ...
}
```

### 6.2 StepOption 表

```prisma
model StepOption {
  id         String  @id @default(uuid())
  stepId     String
  assetUrl   String  // 图片 URL
  metadata   Json    // 元数据
  sortOrder  Int     // 排序
  isSelected Boolean @default(false)
  ...
}
```

### 6.3 Metadata 结构

```typescript
{
  source: "ai",                    // 来源: ai | upload
  prompt: string,                  // 原始提示词
  revisedPrompt?: string,          // 修订后提示词
  model?: string,                  // 模型名称
  size?: string,                   // 图片尺寸
  batchId: string,                 // 批次 ID
  batchStartTime: string,          // 批次开始时间
  generatedAt: string              // 生成时间
}
```

---

## 七、状态流转图

```
用户点击 "AI 生成"
    ↓
前端: setIsGenerating(true)
    ↓
POST /api/projects/[id]/steps/images/generate
    ↓
后端: 验证权限 → 获取文案 → 创建步骤
    ↓
后端: status = GENERATING
    ↓
后端: 启动异步任务 → 立即返回 { batchId }
    ↓
前端: 收到响应 → setCurrentBatchId → mutate()
    ↓
前端: 检测到 status = GENERATING → 启动轮询 (3秒)
    ↓
后端异步: 生成提示词 → 逐张生成图片
    ↓
后端异步: 每生成一张 → 立即保存到数据库
    ↓
前端轮询: 获取最新数据 → 显示新图片
    ↓
后端异步: 全部完成 → status = COMPLETED
    ↓
前端轮询: 检测到 COMPLETED → 停止轮询
    ↓
前端: 显示完整图片列表
```

---

## 八、错误处理

### 8.1 前端错误处理

```typescript
try {
  // 生成逻辑
} catch (err) {
  const message = err instanceof Error ? err.message : "生成图片失败";
  setError(message);
} finally {
  setIsGenerating(false);
}
```

**错误显示**: `<AIErrorDisplay>` 组件

### 8.2 后端错误处理

```typescript
catch (error) {
  console.error("[images/generate] 异步生成图片失败:", error);
  await prisma.projectStep.update({
    where: { id: stepId },
    data: {
      status: generatedCount > 0 ? StepStatus.COMPLETED : StepStatus.FAILED
    },
  });
  runningTasks.delete(batchId);
}
```

**容错策略**:
- 如果已生成部分图片: 状态设为 `COMPLETED`
- 如果一张都没生成: 状态设为 `FAILED`
- 单张失败不影响其他图片

### 8.3 超时处理

**bltcy API 超时**:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟

try {
  const response = await fetch(apiUrl, {
    signal: controller.signal,
    ...
  });
} catch (error) {
  if (error.name === "AbortError") {
    throw new Error("Bltcy Image API timeout after 120s");
  }
}
```

---

## 九、性能优化

### 9.1 异步生成

- **优点**: 不阻塞用户操作，立即返回响应
- **实现**: 后台任务 + 前端轮询

### 9.2 逐张保存

- **优点**: 用户可以实时看到生成进度
- **实现**: 每生成一张立即写入数据库

### 9.3 轮询优化

- **条件轮询**: 仅在 `GENERATING` 状态时轮询
- **间隔**: 3 秒，平衡实时性和服务器压力
- **自动停止**: 完成后自动停止轮询

### 9.4 批次管理

- **批次 ID**: 追踪每次生成任务
- **取消功能**: 支持中途取消
- **内存管理**: 完成后清理任务记录

---

## 十、用户体验设计

### 10.1 视觉反馈

1. **按钮状态**
   - 正常: Sparkles 图标 + "AI 生成"
   - 生成中: 旋转 Loader + "生成中..."
   - 禁用: 灰色不可点击

2. **进度提示**
   - 蓝色提示框: "正在生成图片..."
   - 说明文字: "图片生成需要一些时间，完成后会自动显示"
   - 取消按钮: 允许中途取消

3. **实时更新**
   - 瀑布流布局自动添加新图片
   - 批次信息: "X 个批次 · 共 Y 张图片"

### 10.2 交互设计

1. **防重复点击**: 生成中禁用按钮
2. **错误提示**: 顶部显示错误信息，可关闭
3. **空状态**: 无图片时显示引导界面
4. **选择反馈**: 选中图片显示蓝色边框和勾选标记

---

## 十一、总结

### 核心特性

1. **异步生成**: 不阻塞用户，后台处理
2. **实时反馈**: 轮询机制 + 逐张保存
3. **可取消**: 支持中途取消任务
4. **容错性**: 单张失败不影响整体
5. **多服务商**: 支持标准 DALL-E 和 bltcy 格式

### 技术亮点

1. **状态管理**: 前端状态 + 数据库状态 + 内存任务表
2. **轮询优化**: 条件轮询，自动启停
3. **服务适配**: 自动识别服务商，适配不同 API 格式
4. **批次追踪**: UUID 批次 ID，支持并发任务

### 改进建议

1. **WebSocket**: 替代轮询，实现真正的实时推送
2. **进度条**: 显示具体进度 (X/4 张)
3. **队列系统**: 使用 Redis/Bull 管理任务队列
4. **重试机制**: 失败图片自动重试
5. **缓存优化**: 相同提示词复用结果
