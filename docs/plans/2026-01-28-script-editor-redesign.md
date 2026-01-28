# 剧本编辑器重设计方案

**日期**: 2026-01-28
**状态**: 已批准

## 需求背景

优化剧本管理页面的「创建剧本」功能，替换原有交互形式并补充核心字段与 AI 能力。

### 核心目标

1. 将弹窗式创建改为独立页面
2. 支持多角色选择（原为单角色）
3. 新增剧本名称、脚本基调、脚本大概字段
4. 实现 AI 生成场景功能

## 设计决策

### 1. 路由设计

**方案**: 统一的创建/编辑页面（RESTful 规范）

- 创建：`/projects/:id/scripts/new`
- 编辑：`/projects/:id/scripts/:scriptId/edit`

**优点**: 语义清晰，符合 RESTful 规范，便于权限控制

### 2. 角色多选交互

**方案**: 卡片网格 + 复选框（紧凑版）

- 展示形式：角色卡片网格布局（复用 CharacterCard 组件）
- 选中状态：卡片边框高亮 + 右上角勾选图标
- 卡片尺寸：紧凑版（高度约 120px）
- 布局：响应式网格（桌面 4 列，平板 3 列，手机 2 列）

### 3. 脚本基调设计

**方案**: 组合式输入框（Combobox）

- 预设选项：轻松搞笑、悬疑紧张、温情治愈、励志向上、浪漫唯美、惊悚恐怖、科幻未来、历史厚重、青春活力
- 支持自定义输入
- 实时过滤匹配
- 非必填字段

### 4. AI 生成场景交互

**方案**: 即时插入到场景列表

- 用户输入场景数量（1-20）
- 点击生成按钮
- 显示加载状态（进度提示）
- 生成完成后直接插入到场景列表
- 支持单个场景的编辑/删除

### 5. 页面布局

**方案**: 单页滚动布局

- 所有区域垂直排列，可滚动
- 采用 glassmorphism 风格（与 SceneEdit 页面一致）
- 响应式设计

### 6. 脚本大概生成

**方案**: 手动触发

- 用户点击"AI 生成脚本大概"按钮
- 基于已选角色、项目信息、脚本基调生成
- 生成后填充到文本框
- 支持手动编辑

### 7. 场景列表展示

**方案**: 紧凑卡片列表

- 垂直排列的场景卡片
- 显示：序号、标题、描述（截断）、出场角色头像、时长
- 操作：编辑、删除
- 可选：拖拽排序

### 8. 数据模型调整

**方案**: 新增关联表

- 新增 `ScriptCharacter` 关联表（多对多）
- `ProjectScript` 新增字段：name, tone, synopsis
- 保留 `characterId` 用于向后兼容

## 页面组件结构

```
ScriptEditor (新建页面)
├── 顶部操作栏
│   ├── 页面标题（创建剧本 / 编辑剧本）
│   ├── 保存按钮
│   └── 取消按钮
├── 基本信息卡片
│   ├── 剧本名称输入框（必填，最大 50 字符）
│   └── 脚本基调 Combobox（非必填）
├── 角色选择卡片
│   ├── 标题："选择角色"
│   └── 角色卡片网格（紧凑版，支持多选）
├── 脚本大概卡片
│   ├── AI 生成按钮（需要先选择角色和基调）
│   └── 文本输入框（支持手动编辑）
└── 场景管理卡片
    ├── AI 生成场景控制区
    │   ├── 场景数量输入框（1-20）
    │   └── 生成按钮（需要先有脚本大概）
    └── 场景列表（紧凑卡片，支持编辑/删除）
```

## 数据模型

### 新增表：ScriptCharacter

```prisma
model ScriptCharacter {
  id          String   @id @default(uuid())
  scriptId    String   @map("script_id")
  characterId String   @map("character_id")
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")

  script    ProjectScript    @relation(fields: [scriptId], references: [id], onDelete: Cascade)
  character ProjectCharacter @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@unique([scriptId, characterId])
  @@index([scriptId])
  @@index([characterId])
  @@map("script_characters")
}
```

### 修改表：ProjectScript

```prisma
model ProjectScript {
  // 现有字段保持不变
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  title       String
  description String?  @db.Text
  version     Int      @default(1)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // 新增字段
  name        String   // 剧本名称（必填，最大 50 字符）
  tone        String?  // 脚本基调（非必填）
  synopsis    String?  @db.Text // 脚本大概（非必填）

  // 新增关联
  scriptCharacters ScriptCharacter[]

  // 保留用于向后兼容
  characterId String? @map("character_id")
  character   ProjectCharacter? @relation(fields: [characterId], references: [id], onDelete: Cascade)

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scenes  ScriptScene[]

  @@index([projectId])
  @@index([characterId])
  @@map("project_scripts")
}
```

## API 设计

### 修改现有 API

**POST /api/projects/[id]/scripts** - 创建剧本
```typescript
// 请求体
{
  name: string;           // 新增：剧本名称
  tone?: string;          // 新增：脚本基调
  synopsis?: string;      // 新增：脚本大概
  characterIds: string[]; // 新增：角色 ID 数组
}
```

**PUT /api/projects/[id]/scripts/[scriptId]** - 更新剧本
```typescript
// 请求体（同创建）
{
  name: string;
  tone?: string;
  synopsis?: string;
  characterIds: string[];
}
```

### 新增 API

**POST /api/projects/[id]/scripts/generate-synopsis** - AI 生成脚本大概
```typescript
// 请求体
{
  characterIds: string[];
  tone: string;
}
// 响应
{
  synopsis: string;
}
```

**POST /api/projects/[id]/scripts/generate-scenes** - AI 生成场景
```typescript
// 请求体
{
  characterIds: string[];
  tone: string;
  synopsis: string;
  sceneCount: number; // 1-20
}
// 响应
{
  scenes: Array<{
    title: string;
    duration: number;
    content: SceneContent;
  }>;
}
```

## 表单校验

### 校验规则

1. **剧本名称**
   - 必填：提示"请输入剧本名称"
   - 长度：最大 50 字符，超出时提示"剧本名称不能超过 50 个字符"
   - 实时显示字符计数（如 "25/50"）

2. **角色选择**
   - 必选：至少选择 1 个角色，否则提示"请至少选择一个角色"
   - 未选择时禁用保存按钮

3. **场景数量**
   - 范围：1-20，超出时提示"场景数量必须在 1-20 之间"
   - 类型：只允许正整数

### 按钮状态

1. **生成脚本大概按钮**
   - 禁用条件：未选择角色 OR 未填写基调
   - 加载状态：显示 spinner + "生成中..."

2. **AI 生成场景按钮**
   - 禁用条件：脚本大概为空
   - 加载状态：显示进度 + "正在生成第 X/N 个场景..."

3. **保存按钮**
   - 禁用条件：剧本名称为空 OR 未选择角色

## 错误处理

### AI 生成错误

1. **生成脚本大概失败**
   - Toast 提示："生成失败，请重试"
   - 保留用户已输入内容
   - 允许重新生成或手动输入

2. **生成场景失败**
   - Toast 提示："生成场景失败：[错误原因]"
   - 保留已生成的场景（如果有）
   - 允许重新生成或手动添加

3. **网络超时**
   - 超时时间：60 秒
   - 显示加载进度
   - 超时后提示重试

### 保存操作错误

- 网络错误：提示"保存失败，请检查网络连接"
- 服务器错误：提示"保存失败：[错误信息]"
- 保存成功：Toast 提示 + 跳转到剧本详情页

## 实施步骤

### 1. 数据库迁移
- 创建 Prisma migration 添加新字段和关联表
- 编写数据迁移脚本处理现有数据
- 生成 Prisma Client

### 2. 后端 API 开发
- 修改剧本创建/更新 API 支持新字段
- 实现 AI 生成脚本大概 API
- 实现 AI 生成场景 API
- 添加表单校验和错误处理

### 3. 前端组件开发
- 创建 ScriptEditor 页面组件
- 实现角色选择组件（复用 CharacterCard）
- 实现脚本基调 Combobox
- 实现场景卡片列表组件
- 添加表单校验和加载状态

### 4. 路由配置
- 添加新路由到 App.tsx
- 修改剧本列表页面，移除弹窗，改为跳转到新页面

### 5. 测试与优化
- 测试创建/编辑流程
- 测试 AI 生成功能
- 测试表单校验
- 优化加载性能和用户体验

## 技术要点

- **AI 生成实现**: 调用现有的 AI 服务层（`src/lib/ai/`）
- **状态管理**: 使用 React useState + useEffect
- **表单处理**: 使用 react-hook-form + zod 校验
- **UI 组件**: 复用 shadcn/ui 组件库
- **样式风格**: 与 SceneEdit 页面保持一致的 glassmorphism 风格

## 向后兼容性

- 保留 `ProjectScript.characterId` 字段
- 现有剧本列表页面继续正常工作
- 编辑旧剧本时自动迁移到新的多角色模式
- 数据迁移脚本为现有剧本创建 ScriptCharacter 记录

## 预期成果

1. 用户体验更流畅，独立页面提供更大的操作空间
2. 支持多角色剧本，满足复杂场景需求
3. AI 生成功能提升创作效率
4. 数据模型更规范，易于扩展
