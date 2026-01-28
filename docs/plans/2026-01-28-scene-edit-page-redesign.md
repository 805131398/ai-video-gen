# 场景编辑页面重新设计方案

## 设计日期
2026-01-28

## 背景

当前的场景编辑功能使用弹窗（Modal）方式实现，存在以下问题：
- 弹窗空间有限，编辑体验不佳
- 无法使用浏览器前进/后退功能
- 无法直接分享编辑链接
- 不适合需要长时间编辑的场景

## 设计目标

将场景编辑从弹窗改为独立的页面路由，并采用现代极简风格重新设计 UI，提升编辑体验。

## 核心决策

### 1. 路由结构
- **选择方案**：独立的编辑页面路由
- **路由路径**：`/projects/:id/scripts/:scriptId/scenes/:sceneId/edit`
- **优点**：
  - URL 清晰，支持浏览器前进/后退
  - 可以直接分享编辑链接
  - 适合需要深度编辑、编辑时间较长的场景

### 2. 页面布局
- **选择方案**：单页面分区块布局
- **布局特点**：
  - 所有内容在一个页面中
  - 通过可折叠卡片分区
  - 避免分步骤向导的复杂性
- **优点**：
  - 用户可以一次性看到所有内容
  - 不需要在步骤之间来回切换
  - 使用折叠面板管理空间
  - 适合快速编辑和跨区域编辑

### 3. 设计风格
- **选择方案**：现代极简风格
- **设计特点**：
  - 大量留白，清晰的视觉层次
  - 柔和的渐变背景，玻璃态效果（glassmorphism）
  - 圆角卡片，微妙的阴影
- **适用场景**：专业创作工具，减少视觉干扰

### 4. 内容划分
将场景编辑内容划分为 4 个核心区块：
1. **基本信息** - 场景标题、描述、时长
2. **角色与台词** - 选择角色、配置动作、编辑台词
3. **镜头与视觉** - 镜头类型、运镜方式、光线、色调、特效
4. **音频设置** - 背景音乐、音效、音量控制

## 详细设计

### 整体架构

```
SceneEditPage (新建页面组件)
├── Header (固定顶部)
│   ├── 返回按钮 + 面包屑导航
│   ├── 场景标题（可编辑）
│   └── 保存/取消按钮
├── MainContent (可滚动内容区)
│   ├── BasicInfoCard (基本信息卡片 - 始终展开)
│   ├── CharacterDialogueCard (角色与台词 - 可折叠)
│   ├── CameraVisualCard (镜头与视觉 - 可折叠)
│   └── AudioSettingsCard (音频设置 - 可折叠)
└── QuickNav (右侧浮动导航 - 可选)
    └── 锚点链接快速跳转
```

### 导航流程

1. 用户在剧本页面（`ProjectScript.tsx`）点击"编辑场景"
2. 使用 `navigate()` 跳转到独立的编辑页面
3. 编辑完成后，点击"保存"自动返回剧本页面
4. 支持浏览器前进/后退按钮

### 组件设计

#### 页面头部（Header）

**布局**：
- 固定在顶部，背景使用玻璃态效果（backdrop-blur + 半透明白色）
- 左侧：返回按钮 + 面包屑（项目名 > 剧本名 > 场景编辑）
- 中间：场景标题（inline 可编辑，点击即可修改）
- 右侧：取消按钮（灰色）+ 保存按钮（蓝色渐变，带图标）

**交互**：
- 返回按钮：`navigate(-1)` 返回上一页
- 保存按钮：提交所有表单数据，成功后自动返回
- 取消按钮：弹出确认对话框（如果有未保存的更改）

#### 内容区卡片设计

**卡片样式**（现代极简风格）：
- 白色背景，圆角 16px
- 微妙的阴影：`shadow-lg shadow-slate-200/50`
- 卡片间距：`gap-6`
- 每个卡片有标题栏 + 内容区

**卡片标题栏**：
- 左侧：图标 + 标题（如 "📝 基本信息"）
- 右侧：折叠/展开按钮（除了基本信息卡片）
- 底部：细分隔线

**4 个核心卡片**：
1. **基本信息卡片** - 始终展开，包含场景描述和时长
2. **角色与台词卡片** - 角色选择器 + 动作配置 + 台词列表
3. **镜头与视觉卡片** - 镜头设置 + 光线色调 + 特效
4. **音频设置卡片** - 背景音乐 + 音效 + 音量滑块

### 数据流与状态管理

#### 数据加载流程

**页面初始化**：
1. 从 URL 参数获取 `projectId`, `scriptId`, `sceneId`
2. 并行加载三个数据源：
   - `getScene(projectId, scriptId, sceneId)` - 场景详情
   - `getProjectCharacters(projectId)` - 项目角色列表
   - `getScript(projectId, scriptId)` - 剧本信息（用于面包屑）

**状态管理**：
```typescript
// 页面状态
const [scene, setScene] = useState<ScriptScene | null>(null)
const [characters, setCharacters] = useState<ProjectCharacter[]>([])
const [script, setScript] = useState<ProjectScript | null>(null)
const [loading, setLoading] = useState(true)
const [saving, setSaving] = useState(false)

// 表单状态（受控组件）
const [formData, setFormData] = useState<Partial<ScriptScene>>({})

// UI 状态
const [expandedCards, setExpandedCards] = useState({
  basic: true,
  character: true,
  camera: true,
  audio: true,
})
```

#### 保存流程

**实时本地保存**：
- 每个表单字段变化时，更新 `formData` 状态
- 不立即发送到服务器，避免频繁请求

**提交保存**：
1. 点击"保存"按钮，触发 `handleSave()`
2. 调用 `updateScene(projectId, scriptId, sceneId, formData)`
3. 成功后：显示成功提示 + 自动返回剧本页面
4. 失败后：显示错误提示，保持在当前页面

**未保存提示**：
- 使用 `useEffect` 监听 `formData` 变化，标记为"有未保存更改"
- 点击"取消"或浏览器返回时，弹出确认对话框

### UI 设计细节（现代极简风格）

#### 配色方案

**主色调**：
- 背景：柔和渐变 `bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50`
- 主色：蓝色系 `blue-600` (按钮、链接、强调)
- 文字：`slate-900` (标题), `slate-600` (正文), `slate-500` (辅助)

**玻璃态效果**（glassmorphism）：
- 卡片背景：`bg-white/80 backdrop-blur-xl`
- 头部背景：`bg-white/70 backdrop-blur-lg`
- 边框：`border border-white/20`
- 阴影：`shadow-xl shadow-slate-200/50`

#### 间距与圆角

**圆角**：
- 卡片：`rounded-2xl` (16px)
- 按钮：`rounded-xl` (12px)
- 输入框：`rounded-lg` (8px)

**间距**：
- 页面边距：`px-8 py-6`
- 卡片间距：`space-y-6`
- 卡片内边距：`p-6`
- 表单字段间距：`space-y-4`

#### 交互效果

**按钮**：
- 主按钮：蓝色渐变 `bg-gradient-to-r from-blue-600 to-blue-500` + hover 提升
- 次按钮：白色背景 + 灰色边框 + hover 变灰
- 过渡：`transition-all duration-200`
- Hover：`hover:scale-105 hover:shadow-lg`

**卡片折叠动画**：
- 使用 `transition-all duration-300 ease-in-out`
- 内容区：`overflow-hidden` + 动态高度

**输入框**：
- 默认：`border-slate-200`
- Focus：`focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`
- 过渡：`transition-colors duration-200`

### 表单字段设计

#### 1. 基本信息卡片

**字段**：
- 场景标题：大号输入框，placeholder "输入场景标题"
- 场景描述：多行文本框（4-6 行），placeholder "描述场景内容、氛围、关键元素..."
- 场景时长：数字输入 + 单位选择器（秒/分钟），带滑块快速调整

**布局**：垂直堆叠，每个字段占满宽度

#### 2. 角色与台词卡片

**角色选择**：
- 下拉选择器 + 头像预览
- 支持搜索过滤
- 显示角色名称和简介

**动作配置**：
- 三个输入框：入场动作、主要动作、出场动作
- 每个输入框带快速选择按钮（常用动作）

**台词列表**：
- 可添加多条台词
- 每条台词：序号 + 文本框 + 删除按钮
- 底部"+ 添加台词"按钮

#### 3. 镜头与视觉卡片

**镜头设置**（2 列布局）：
- 镜头类型：下拉选择（固定、跟随、环绕等）
- 运镜方式：下拉选择（推、拉、摇、移等）
- 景别：下拉选择（特写、近景、中景、远景等）
- 自定义描述：文本框

**视觉效果**（2 列布局）：
- 光线条件：选择器（日光、夜晚、室内等）
- 色调/氛围：选择器（温暖、冷色、复古等）
- 特效：多选框（慢动作、模糊、粒子等）
- 自定义描述：文本框

#### 4. 音频设置卡片

**音频配置**：
- 背景音乐：下拉选择 + 预览播放按钮
- 音效：多选 + 预览播放按钮
- 音量控制：滑块（0-100%）+ 数字显示

**布局**：垂直堆叠，每个字段带图标和标签

## 技术栈

- **框架**：React + TypeScript
- **路由**：React Router
- **样式**：Tailwind CSS
- **图标**：Lucide React
- **状态管理**：React Hooks (useState, useEffect)

## 实施步骤

1. **创建新页面组件**
   - 创建 `client/src/pages/SceneEdit.tsx`
   - 配置路由 `/projects/:id/scripts/:scriptId/scenes/:sceneId/edit`

2. **实现页面头部**
   - 返回按钮和面包屑导航
   - 可编辑的场景标题
   - 保存和取消按钮

3. **实现 4 个核心卡片组件**
   - `BasicInfoCard.tsx` - 基本信息
   - `CharacterDialogueCard.tsx` - 角色与台词
   - `CameraVisualCard.tsx` - 镜头与视觉
   - `AudioSettingsCard.tsx` - 音频设置

4. **实现数据加载和保存逻辑**
   - 并行加载场景、角色、剧本数据
   - 表单状态管理
   - 保存和取消逻辑
   - 未保存提示

5. **应用 UI 设计**
   - 使用 /ui-ux-pro-max 优化视觉效果
   - 实现玻璃态效果和渐变背景
   - 添加交互动画和过渡效果

6. **修改剧本页面**
   - 将"编辑场景"按钮改为路由跳转
   - 移除原有的弹窗编辑器

7. **测试和优化**
   - 功能测试
   - 响应式测试
   - 性能优化

## 预期效果

- ✅ 独立的编辑页面，支持浏览器导航
- ✅ 单页面分区块布局，所有内容一目了然
- ✅ 现代极简风格，视觉体验优秀
- ✅ 清晰的数据流和状态管理
- ✅ 完整的表单字段设计
- ✅ 流畅的交互动画和过渡效果

## 相关文档

- [场景编辑器集成总结](../features/场景编辑器集成总结.md)
- [场景编辑器表单实现](../features/场景编辑器表单实现总结.md)
