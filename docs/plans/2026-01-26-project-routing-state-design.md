# 项目路由与状态管理设计

## 概述

本设计解决两个问题：
1. 生成按钮缺少 Loading 效果
2. 刷新页面后丢失当前步骤状态

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 状态持久化 | 混合方案（URL 路由 + 服务端数据库） | 支持分享链接，跨设备恢复 |
| 路由结构 | 项目嵌套路由 `/projects/[id]/[step]` | 语义清晰，与数据库模型对应 |
| 新建流程 | 先创建空项目，再跳转编辑 | 路由统一，状态管理简单 |
| 状态管理 | SWR | 自动缓存，数据来源单一 |

## 路由结构

```
web/src/app/
├── (main)/
│   ├── page.tsx                    # 首页（项目列表 + 新建入口）
│   └── projects/
│       └── [projectId]/
│           ├── layout.tsx          # 共享布局（步骤指示器、侧边栏）
│           ├── topic/page.tsx      # 步骤1: 主题输入
│           ├── title/page.tsx      # 步骤2: 标题选择
│           ├── attributes/page.tsx # 步骤3: 属性设置
│           ├── copy/page.tsx       # 步骤4: 文案选择
│           ├── images/page.tsx     # 步骤5: 图片选择
│           ├── videos/page.tsx     # 步骤6: 视频选择
│           ├── voice/page.tsx      # 步骤7: 配音配置
│           └── compose/page.tsx    # 步骤8: 最终合成
```

## 步骤映射

| URL 路径 | StepType (数据库) | 步骤索引 |
|----------|-------------------|----------|
| `/topic` | `TOPIC_INPUT` | 0 |
| `/title` | `TITLE_SELECT` | 1 |
| `/attributes` | `ATTRIBUTE_SET` | 2 |
| `/copy` | `COPY_SELECT` | 3 |
| `/images` | `IMAGE_SELECT` | 4 |
| `/videos` | `VIDEO_SELECT` | 5 |
| `/voice` | `VOICE_CONFIG` | 6 |
| `/compose` | `COMPOSE` | 7 |

## Layout 组件设计

**职责：**
1. 加载项目基础信息（通过 SWR）
2. 渲染步骤指示器（StepIndicator）
3. 渲染侧边栏（版本历史、新建按钮等）
4. 处理步骤跳转逻辑（只能跳转到已完成或当前步骤）
5. 提供 ProjectContext 给子页面

**步骤保护逻辑：**
- 用户访问 `/projects/[id]/copy` 时，Layout 检查项目的 `currentStep`
- 如果 `currentStep` 是 `TITLE_SELECT`（步骤1），则重定向到 `/projects/[id]/title`
- 防止用户通过 URL 跳过步骤

## API 设计

### 端点列表

```
POST   /api/projects              # 创建空项目（返回 projectId）
GET    /api/projects/[id]         # 获取项目详情
PATCH  /api/projects/[id]         # 更新项目
DELETE /api/projects/[id]         # 删除项目

POST   /api/projects/[id]/steps/[step]/generate   # 触发 AI 生成
POST   /api/projects/[id]/steps/[step]/select     # 选择选项并推进下一步
```

### 项目详情响应结构

```typescript
interface ProjectResponse {
  id: string;
  topic: string;
  title: string | null;
  status: ProjectStatus;
  currentStep: StepType;
  currentVersion: {
    id: string;
    versionNo: number;
  };
  steps: {
    topic: { value: string } | null;
    titles: { options: TitleOption[]; selectedId: string | null } | null;
    attributes: CopyAttributes | null;
    copies: { options: CopyOption[]; selectedId: string | null } | null;
    images: { options: ImageOption[]; selectedIds: string[] } | null;
    videos: { options: VideoOption[]; selectedIds: string[] } | null;
    voice: VoiceConfig | null;
    compose: { videoUrl: string | null; progress: number } | null;
  };
}
```

## Loading 状态设计

### 按钮 Loading 状态

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      生成中...
    </>
  ) : (
    <>
      <Sparkles className="w-4 h-4 mr-2" />
      生成标题
    </>
  )}
</Button>
```

### Loading 效果清单

1. **按钮 Loading 状态** - 使用 `Loader2` 图标旋转动画，按钮禁用
2. **全局 Loading 指示** - 步骤指示器中当前步骤显示 loading 状态
3. **骨架屏** - 页面初次加载时显示骨架屏

## SWR Hook 设计

```typescript
// hooks/use-project.ts
export function useProject(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<ProjectResponse>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher
  );

  return {
    project: data,
    isLoading,
    isError: error,
    mutate,
  };
}
```

### 数据流

```
用户操作 → 调用 API（生成/选择）→ API 更新数据库 → 返回成功
                                                    ↓
                                            调用 mutate() 刷新 SWR 缓存
                                                    ↓
                                            UI 自动更新
```

## 文件清单

### 新增文件

```
web/src/app/(main)/projects/[projectId]/
├── layout.tsx
├── topic/page.tsx
├── title/page.tsx
├── attributes/page.tsx
├── copy/page.tsx
├── images/page.tsx
├── videos/page.tsx
├── voice/page.tsx
└── compose/page.tsx

web/src/app/api/projects/
├── route.ts
└── [id]/
    ├── route.ts
    └── steps/[step]/
        ├── generate/route.ts
        └── select/route.ts

web/src/hooks/use-project.ts
web/src/types/project.ts
```

### 修改文件

```
web/src/app/(main)/page.tsx           # 简化为项目列表 + 新建入口
web/src/components/studio/TopicInput.tsx  # 添加 Loader2 动画
web/src/lib/services/project-service.ts   # 项目业务逻辑
```

## 实现阶段

### Phase 1 - 基础架构
- 创建 `use-project.ts` hook
- 创建项目 API（创建、获取、更新）
- 创建 Layout 组件

### Phase 2 - 步骤页面
- 迁移各步骤组件到独立页面
- 实现步骤保护逻辑

### Phase 3 - Loading 优化
- 添加按钮 Loading 动画
- 添加骨架屏

### Phase 4 - 首页改造
- 简化首页为项目列表
- 实现"新建作品"流程
