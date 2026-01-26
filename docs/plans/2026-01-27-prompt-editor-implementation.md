# 提示词编辑功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 或 superpowers:subagent-driven-development 来执行此计划

**Goal:** 为图片生成功能添加提示词编辑能力，支持双语编辑、翻译和并发生成

**Architecture:** 对话框模式选择 → 双语编辑界面 → AI 翻译服务 → 并发图片生成

**Tech Stack:** Next.js 16, TypeScript, shadcn/ui, Prisma 7

**参考:** `docs/plans/2026-01-27-prompt-editor-design.md`

---

## 实现任务列表

### 阶段 1: 后端服务 (5 个任务)

1. **创建翻译服务** (`web/src/lib/ai/translator.ts`)
   - 实现 `translateText(text, direction, userId, tenantId)` 函数
   - 支持双向翻译 (en-zh, zh-en)
   - 使用现有的文本生成 AI 配置

2. **修改提示词生成返回双语** (`web/src/lib/ai/image-generator.ts`)
   - 修改 `generateImagePromptFromCopy` 返回 `{ prompt, translation }`
   - 调用翻译服务自动翻译为中文
   - 更新所有调用处

3. **创建翻译 API** (`web/src/app/api/projects/[id]/steps/images/translate/route.ts`)
   - POST 端点接收 `{ text, direction }`
   - 返回 `{ translation }`
   - 添加权限验证

4. **创建提示词生成 API** (`web/src/app/api/projects/[id]/steps/images/prompt/route.ts`)
   - POST 端点生成双语提示词
   - 获取项目文案内容
   - 返回 `{ prompt, translation }`

5. **修改图片生成 API 支持并发** (`web/src/app/api/projects/[id]/steps/images/generate/route.ts`)
   - 添加 `count` 和 `customPrompt` 参数
   - 修改 `generateImagesAsync` 使用 `Promise.all()` 并发生成
   - 支持自定义提示词

### 阶段 2: 前端组件 (3 个任务)

6. **创建图片数量选择器** (`web/src/components/studio/ImageCountSelector.tsx`)
   - Select 组件，选项 [1,2,3,4,5,6,8]
   - 默认值 4
   - 可复用组件

7. **创建生成模式选择对话框** (`web/src/components/studio/GenerateModeDialog.tsx`)
   - 两个选项卡片：直接生成 / 先生成提示词
   - 集成 ImageCountSelector
   - 回调函数：onDirectGenerate, onPromptGenerate

8. **创建提示词编辑对话框** (`web/src/components/studio/PromptEditorDialog.tsx`)
   - 左右分栏：英文 / 中文
   - 翻译按钮：英→中，中→英
   - 集成 ImageCountSelector
   - 生成图片按钮

### 阶段 3: 集成 (1 个任务)

9. **集成到图片页面** (`web/src/app/(main)/projects/[projectId]/images/page.tsx`)
   - 修改 "AI 生成" 按钮点击逻辑
   - 添加状态管理
   - 集成两个对话框
   - 实现完整流程

---

## 详细实现步骤

### Task 1: 创建翻译服务

**文件:** `web/src/lib/ai/translator.ts`

**代码:**
```typescript
import { getEffectiveAIConfig } from "@/lib/services/ai-config-service";
import { AIModelType } from "@/generated/prisma/enums";

export async function translateText(
  text: string,
  direction: 'en-zh' | 'zh-en',
  userId?: string,
  tenantId?: string
): Promise<string> {
  const config = await getEffectiveAIConfig(AIModelType.TEXT, userId, tenantId);
  if (!config) throw new Error("未找到可用的文本生成 AI 配置");

  const systemPrompt = direction === 'en-zh'
    ? "你是专业的英译中翻译专家。请将英文翻译成中文，保持原意，使用自然流畅的中文表达。只输出翻译结果。"
    : "你是专业的中译英翻译专家。请将中文翻译成英文，保持原意，使用自然流畅的英文表达。只输出翻译结果。";

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
      temperature: 0.3,
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

**提交:**
```bash
git add web/src/lib/ai/translator.ts
git commit -m "feat: add translation service"
```

---

### Task 2-5: 后端 API 实现

参考设计文档中的代码示例，依次实现：
- 修改 `image-generator.ts` 返回双语
- 创建 `translate/route.ts`
- 创建 `prompt/route.ts`  
- 修改 `generate/route.ts` 支持并发

每个任务完成后提交一次。

---

### Task 6-8: 前端组件实现

参考设计文档中的 UI 组件设计，依次创建：
- `ImageCountSelector.tsx` - 数量选择器
- `GenerateModeDialog.tsx` - 模式选择对话框
- `PromptEditorDialog.tsx` - 提示词编辑器

每个组件完成后提交一次。

---

### Task 9: 集成到图片页面

**文件:** `web/src/app/(main)/projects/[projectId]/images/page.tsx`

**修改步骤:**

1. 添加状态管理
2. 修改 "AI 生成" 按钮逻辑
3. 添加两个对话框组件
4. 实现完整流程

**关键代码片段:**

```typescript
// 状态
const [showModeDialog, setShowModeDialog] = useState(false);
const [showPromptEditor, setShowPromptEditor] = useState(false);
const [promptData, setPromptData] = useState({ english: '', chinese: '' });
const [imageCount, setImageCount] = useState(4);

// 修改按钮点击
const handleGenerate = () => {
  setShowModeDialog(true);
};

// 直接生成
const handleDirectGenerate = async (count: number) => {
  // 调用现有的生成逻辑，传入 count
};

// 生成提示词
const handlePromptGenerate = async (count: number) => {
  setImageCount(count);
  // 调用 /api/projects/${projectId}/steps/images/prompt
  // 显示提示词编辑器
  setShowPromptEditor(true);
};

// 使用提示词生成图片
const handleGenerateWithPrompt = async (prompt: string, count: number) => {
  // 调用 /api/projects/${projectId}/steps/images/generate
  // 传入 customPrompt 和 count
};
```

**提交:**
```bash
git add web/src/app/(main)/projects/[projectId]/images/page.tsx
git commit -m "feat: integrate prompt editor into images page"
```

---

## 测试清单

- [ ] 翻译服务：英→中，中→英
- [ ] 提示词生成：返回双语结果
- [ ] 直接生成：选择数量，生成图片
- [ ] 提示词编辑：生成、编辑、翻译、生成图片
- [ ] 并发生成：多张图片同时生成
- [ ] 错误处理：API 失败、翻译失败
- [ ] UI 响应：加载状态、禁用状态
- [ ] 数量配置：1-8 张可选

---

## 提交规范

每个任务完成后立即提交，使用以下格式：

```bash
feat: <简短描述>
```

示例：
- `feat: add translation service`
- `feat: add generate mode dialog`
- `feat: integrate prompt editor`

---

## 注意事项

1. **DRY**: 复用 ImageCountSelector 组件
2. **YAGNI**: 不保存提示词到数据库
3. **错误处理**: 所有 API 调用都要 try-catch
4. **类型安全**: 使用 TypeScript 类型定义
5. **UI 一致性**: 使用 shadcn/ui 组件
6. **并发安全**: Promise.all() 中处理单个失败

