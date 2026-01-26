# 图片生成提示词编辑功能设计

## 概述

为图片生成功能添加提示词编辑能力，让用户可以选择直接生成图片或先生成提示词进行编辑后再生成。提供双语（英文/中文）对照编辑界面，支持双向翻译，并允许用户自定义生成图片数量。

## 设计决策

### 1. 生成模式选择
- **方式**：弹出对话框选择
- **选项**：
  - 直接生成图片（走现有流程）
  - 先生成提示词（新流程）
- **优势**：清晰明确，不改变现有按钮布局

### 2. 提示词编辑界面
- **布局**：左右分栏
  - 左侧：英文提示词（可编辑）
  - 右侧：中文翻译（可编辑）
  - 中间：翻译按钮
- **优势**：对照清晰，适合桌面端

### 3. 翻译功能
- **触发方式**：手动按钮触发
- **方向**：双向（英→中，中→英）
- **实现**：复用现有的文本生成 AI
- **优势**：用户可控，节省 API 调用

### 4. 提示词存储
- **策略**：仅用于当前生成
- **说明**：不保存到数据库，保持功能简单

### 5. 图片数量配置
- **位置**：模式选择对话框和提示词编辑对话框
- **范围**：1-8 张
- **默认值**：4 张
- **组件**：数字选择器（可复用）

### 6. 并发生成策略
- **方式**：完全并发
- **实现**：使用 Promise.all() 同时生成所有图片
- **优势**：显著提升生成速度（4 张图从 2-4 分钟降到 30-60 秒）

## 用户交互流程

### 现有流程（直接生图）
```
用户点击"AI 生成"
→ 弹出模式选择对话框
→ 选择"直接生成图片" + 配置数量（默认 4）
→ 调用 POST /generate (count: N)
→ 后台生成提示词 + 并发生成图片
→ 轮询显示结果
```

### 新增流程（先生成提示词）
```
用户点击"AI 生成"
→ 弹出模式选择对话框
→ 选择"先生成提示词" + 配置数量（默认 4）
→ 调用 POST /prompt
→ 显示提示词编辑对话框（英文 + 中文）
→ 用户编辑/翻译提示词
→ 点击"生成图片"
→ 调用 POST /generate (count: N, customPrompt: edited)
→ 后台并发生成图片
→ 轮询显示结果
```

## UI 组件设计

### 1. GenerateModeDialog（生成模式选择对话框）

**触发时机**：用户点击"AI 生成"按钮

**对话框内容**：
- 标题："选择生成方式"
- 两个选项卡片：
  - **直接生成图片**
    - 图标：Sparkles
    - 描述："快速生成，使用 AI 自动创建提示词"
    - 按钮："开始生成"
  - **先生成提示词**
    - 图标：FileText
    - 描述："精细控制，编辑提示词后再生成"
    - 按钮："生成提示词"

**图片数量配置**：
- 位置：对话框底部
- 组件：ImageCountSelector
- 标签："生成数量"
- 选项：1, 2, 3, 4, 5, 6, 8
- 默认值：4
- 说明文字："每次生成的图片数量"

### 2. PromptEditorDialog（提示词编辑对话框）

**布局结构**：
- 全屏或大尺寸对话框（max-w-6xl）
- 左右分栏，各占 50% 宽度
- 中间分隔线，带翻译按钮

**左侧面板（英文）**：
- 标题："English Prompt"
- 文本域：多行输入框（textarea），高度约 300px
- 字符计数：显示当前字符数
- 翻译按钮："翻译为中文 →"

**右侧面板（中文）**：
- 标题："中文翻译"
- 文本域：多行输入框（textarea），高度约 300px
- 字符计数：显示当前字符数
- 翻译按钮："← 翻译为英文"

**底部操作栏**：
- 左侧：ImageCountSelector（图片数量配置）
- 右侧：
  - "取消"按钮
  - "生成图片"按钮（主按钮，蓝色）

### 3. ImageCountSelector（图片数量选择器）

**可复用组件**：
- 在 GenerateModeDialog 和 PromptEditorDialog 中使用
- 组件类型：Select 或 Stepper
- 选项：[1, 2, 3, 4, 5, 6, 8]
- 默认值：4

## 技术实现

### 1. 前端状态管理

**新增状态**：
```typescript
// 生成模式
const [generateMode, setGenerateMode] = useState<'direct' | 'prompt' | null>(null);

// 提示词编辑状态
const [promptData, setPromptData] = useState({
  english: '',
  chinese: '',
});

// 生成数量
const [imageCount, setImageCount] = useState(4);

// 翻译加载状态
const [isTranslating, setIsTranslating] = useState(false);

// 对话框显示状态
const [showModeDialog, setShowModeDialog] = useState(false);
const [showPromptEditor, setShowPromptEditor] = useState(false);
```

### 2. API 端点设计

#### 新增 API

**POST `/api/projects/[id]/steps/images/prompt`**
- **功能**：生成图片提示词
- **请求体**：
  ```typescript
  {
    copyContent: string;  // 文案内容
    style?: string;       // 风格（可选）
  }
  ```
- **响应**：
  ```typescript
  {
    prompt: string;       // 英文提示词
    translation: string;  // 中文翻译
  }
  ```

**POST `/api/projects/[id]/steps/images/translate`**
- **功能**：翻译文本
- **请求体**：
  ```typescript
  {
    text: string;                    // 待翻译文本
    direction: 'en-zh' | 'zh-en';   // 翻译方向
  }
  ```
- **响应**：
  ```typescript
  {
    translation: string;  // 翻译结果
  }
  ```

#### 修改现有 API

**POST `/api/projects/[id]/steps/images/generate`**
- **新增参数**：
  ```typescript
  {
    count?: number;         // 生成数量（默认 4）
    customPrompt?: string;  // 自定义提示词（可选）
  }
  ```
- **逻辑变更**：
  - 如果提供 `customPrompt`，直接使用
  - 否则，调用 `generateImagePromptFromCopy` 生成
  - 使用 `Promise.all()` 并发生成多张图片

### 3. 翻译服务实现

**新建文件**：`web/src/lib/ai/translator.ts`

```typescript
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";

/**
 * 使用文本生成 AI 进行翻译
 */
export async function translateText(
  text: string,
  direction: 'en-zh' | 'zh-en',
  userId?: string,
  tenantId?: string
): Promise<string> {
  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的文本生成 AI 配置");
  }

  const systemPrompt = direction === 'en-zh'
    ? "你是一个专业的英译中翻译专家。请将用户提供的英文翻译成中文，保持原意，使用自然流畅的中文表达。只输出翻译结果，不要其他内容。"
    : "你是一个专业的中译英翻译专家。请将用户提供的中文翻译成英文，保持原意，使用自然流畅的英文表达。只输出翻译结果，不要其他内容。";

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
        { role: "user", content: text }
      ],
      temperature: 0.3, // 较低温度，保证翻译准确性
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Translation API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}
```

### 4. 提示词生成优化

**修改**：`web/src/lib/ai/image-generator.ts`

```typescript
/**
 * 根据文案生成图片提示词（返回双语结果）
 */
export async function generateImagePromptFromCopy(
  copywriting: string,
  style?: string,
  userId?: string,
  tenantId?: string
): Promise<{ prompt: string; translation: string }> {
  // 生成英文提示词
  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);

  if (!config) {
    throw new Error("未找到可用的文本生成 AI 配置");
  }

  const systemPrompt = `你是一个专业的 AI 图片提示词专家。请根据用户提供的短视频文案，生成适合的图片生成提示词。
要求：
- 提示词要用英文
- 描述要具体、视觉化
- 适合生成短视频配图
- 只输出提示词，不要其他内容
${style ? `\n风格要求：${style}` : ""}`;

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
        { role: "user", content: copywriting },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const prompt = data.choices[0]?.message?.content || "";

  // 自动翻译为中文
  const translation = await translateText(prompt, 'en-zh', userId, tenantId);

  return { prompt, translation };
}
```

### 5. 并发图片生成实现

**修改**：`web/src/app/api/projects/[id]/steps/images/generate/route.ts`

```typescript
/**
 * 异步生成图片并保存到数据库（并发生成）
 */
async function generateImagesAsync(
  copyContent: string,
  count: number,
  userId: string,
  stepId: string,
  baseSortOrder: number,
  batchId: string,
  batchStartTime: string,
  customPrompt?: string  // 新增：自定义提示词
) {
  let generatedCount = 0;

  try {
    // 检查任务是否已取消
    const task = runningTasks.get(batchId);
    if (task?.cancelled) {
      console.log("[images/generate] 任务已取消，跳过生成:", batchId);
      runningTasks.delete(batchId);
      return;
    }

    // 生成或使用提示词
    let imagePrompt: string;
    if (customPrompt) {
      // 使用用户提供的自定义提示词
      imagePrompt = customPrompt;
      console.log("[images/generate] 使用自定义提示词");
    } else {
      // 生成图片提示词
      console.log("[images/generate] 开始生成图片提示词...");
      const result = await generateImagePromptFromCopy(
        copyContent,
        undefined,
        userId,
        undefined
      );
      imagePrompt = result.prompt;
      console.log("[images/generate] 图片提示词:", imagePrompt?.substring(0, 100));
    }

    // 并发生成所有图片
    console.log(`[images/generate] 开始并发生成 ${count} 张图片...`);
    const startTime = Date.now();

    const generatePromises = Array.from({ length: count }, async (_, i) => {
      // 检查是否取消
      if (runningTasks.get(batchId)?.cancelled) {
        console.log(`[images/generate] 任务已取消，跳过第 ${i + 1} 张`);
        return null;
      }

      console.log(`[images/generate] 开始生成第 ${i + 1}/${count} 张图片...`);

      try {
        const image = await generateSingleImage(
          { prompt: imagePrompt },
          userId,
          undefined
        );

        if (image) {
          // 立即保存到数据库
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
          console.log(`[images/generate] 第 ${i + 1}/${count} 张图片已保存`);
          return image;
        }
      } catch (error) {
        console.error(`[images/generate] 第 ${i + 1}/${count} 张生成失败:`, error);
        return null;
      }
    });

    // 等待所有图片生成完成
    const results = await Promise.all(generatePromises);
    generatedCount = results.filter(r => r !== null).length;

    const elapsed = Date.now() - startTime;
    console.log(`[images/generate] 批次完成，共生成 ${generatedCount}/${count} 张图片，耗时 ${elapsed}ms`);

    // 更新步骤状态为完成
    await prisma.projectStep.update({
      where: { id: stepId },
      data: { status: StepStatus.COMPLETED },
    });
    console.log("[images/generate] 步骤状态已更新为完成");

    // 清理任务记录
    runningTasks.delete(batchId);
  } catch (error) {
    console.error("[images/generate] 异步生成图片失败:", error);
    // 如果已经生成了一些图片，状态设为完成；否则设为失败
    await prisma.projectStep.update({
      where: { id: stepId },
      data: { status: generatedCount > 0 ? StepStatus.COMPLETED : StepStatus.FAILED },
    });
    // 清理任务记录
    runningTasks.delete(batchId);
  }
}
```

## 组件结构

### 新增组件

```
web/src/components/studio/
├── GenerateModeDialog.tsx          # 生成模式选择对话框
├── PromptEditorDialog.tsx          # 提示词编辑对话框
└── ImageCountSelector.tsx          # 图片数量选择器（可复用）
```

### 组件职责

**GenerateModeDialog**：
- 显示两种生成模式选项
- 包含图片数量选择器
- 触发对应的生成流程

**PromptEditorDialog**：
- 左右分栏显示英文和中文
- 翻译按钮和加载状态
- 图片数量配置
- 生成图片按钮

**ImageCountSelector**：
- 数字选择器组件
- 支持 1-8 的范围
- 可在两个对话框中复用

## 文件组织

### 新增 API 路由
```
web/src/app/api/projects/[id]/steps/images/
├── generate/route.ts               # 修改：支持 count 和 customPrompt
├── prompt/route.ts                 # 新增：生成提示词
└── translate/route.ts              # 新增：翻译服务
```

### 新增服务层
```
web/src/lib/ai/
├── image-generator.ts              # 修改：返回双语结果，支持并发生成
└── translator.ts                   # 新增：翻译服务
```

## 错误处理

### 1. 翻译失败处理
- 显示错误提示："翻译失败，请稍后重试"
- 保留原文本，不清空输入框
- 提供重试按钮

### 2. 提示词生成失败
- 显示错误提示："生成提示词失败"
- 允许用户手动输入提示词
- 提供"重新生成"按钮

### 3. 图片生成失败
- 复用现有的错误处理机制
- 显示 AIErrorDisplay 组件
- 部分成功时仍显示已生成的图片

### 4. 并发生成错误处理
- 单张图片失败不影响其他图片
- 记录失败的图片索引
- 最终显示成功生成的数量

## 用户体验优化

### 1. 加载状态
- 生成提示词时：显示骨架屏或加载动画
- 翻译时：按钮显示 loading 状态，禁用输入框
- 生成图片时：复用现有的轮询机制

### 2. 输入验证
- 提示词不能为空
- 提示词长度限制（如 2000 字符）
- 图片数量范围：1-8

### 3. 快捷操作
- 支持 Ctrl+Enter 快速生成图片
- 支持 Esc 关闭对话框

### 4. 响应式设计
- 桌面端：左右分栏布局
- 移动端：考虑上下分栏或标签页切换

## 实现步骤

### 阶段 1：基础功能（核心流程）
1. 创建 GenerateModeDialog 组件
2. 创建 ImageCountSelector 组件
3. 修改 images/page.tsx，集成模式选择
4. 修改 generate API，支持 count 参数

### 阶段 2：提示词编辑（新功能核心）
1. 创建 translator.ts 服务
2. 创建 translate API 路由
3. 创建 prompt API 路由
4. 创建 PromptEditorDialog 组件
5. 集成提示词编辑流程

### 阶段 3：并发生成优化
1. 修改 generateImagesAsync 函数
2. 实现 Promise.all() 并发逻辑
3. 优化错误处理
4. 测试并发性能

### 阶段 4：优化完善（体验提升）
1. 添加错误处理和重试机制
2. 添加加载状态和骨架屏
3. 添加输入验证
4. 添加快捷键支持
5. 优化移动端响应式布局

## 数据库变更

**无需变更**：
- 提示词不保存到数据库
- 复用现有的 StepOption 结构
- metadata 中已有 prompt 字段可用

## 测试要点

1. 两种生成模式的切换
2. 提示词的生成和编辑
3. 双向翻译功能
4. 不同数量的图片生成（1-8 张）
5. 并发生成的性能和稳定性
6. 错误场景的处理
7. 移动端和桌面端的响应式
8. 快捷键功能
9. 输入验证

## 性能考虑

### 并发生成优势
- **串行方式**：4 张图 × 30-60 秒/张 = 2-4 分钟
- **并发方式**：max(30-60 秒) = 30-60 秒
- **提升**：约 4 倍速度提升

### 注意事项
- API 提供商可能有并发限制
- 需要监控 API 调用成功率
- 考虑添加重试机制
- 记录并发生成的性能指标

## 未来扩展

1. **提示词模板**：保存常用提示词为模板
2. **提示词历史**：查看和复用历史提示词
3. **批量生成**：一次生成多个不同提示词的图片
4. **提示词优化建议**：AI 分析并提供优化建议
5. **风格预设**：提供常用风格的快速选择
6. **并发数配置**：允许用户配置并发数量
