# AI 视频创作工具设计文档

> 创建日期: 2026-01-26
> 状态: 已确认

---

## 一、项目概述

### 1.1 产品定位

AI 短视频创作工具，帮助内容创作者和商家快速制作短视频内容。

### 1.2 目标用户

- 内容创作者/博主
- 商家/营销人员

### 1.3 核心特性

| 特性 | 说明 |
|------|------|
| 创作模式 | 可切换（默认自动，任意步骤可介入） |
| 步骤回溯 | 保留式（类似 Git 分支，保留所有历史版本） |
| 图片-视频关系 | 灵活模式（一对一/多对一/独立，用户选择） |
| 配音时机 | 用户选择（先配音或先生成视频） |
| 文案分段 | 可选分段（默认不分段） |
| 提示词模板 | 预设模板 + 自定义组合 |
| AI 模型配置 | 系统默认 + 用户可覆盖 |

### 1.4 MVP 范围

- 文本生成（标题、文案）：调用真实 AI 接口
- 图片生成：调用真实 AI 接口
- 视频生成：模拟数据
- 配音生成：模拟数据
- 最终合成：模拟数据

---

## 二、创作流程

```
主题输入 → 标题生成(N个) → 选择 → 文案属性设置 → 文案生成(N个) → 选择
                                                                    ↓
合成 ← 配音生成 ← 配音配置 ← 视频选择 ← 视频生成(N个) ← 图片选择 ← 图片生成(N个)
```

### 2.1 步骤类型

```
TOPIC_INPUT      // 主题输入
TITLE_GENERATE   // 标题生成
TITLE_SELECT     // 标题选择
ATTRIBUTE_SET    // 文案属性设置
COPY_GENERATE    // 文案生成
COPY_SELECT      // 文案选择
COPY_SEGMENT     // 文案分段（可选）
IMAGE_GENERATE   // 图片生成
IMAGE_SELECT     // 图片选择
VIDEO_GENERATE   // 视频生成
VIDEO_SELECT     // 视频选择
VOICE_CONFIG     // 配音配置
VOICE_GENERATE   // 配音生成
COMPOSE          // 最终合成
```

### 2.2 文案属性

| 类别 | 属性名 | 示例选项 |
|------|--------|----------|
| 叙事视角 | 人称 | 第一人称(我)、第二人称(你)、第三人称(他/她) |
| 角色设定 | 角色 | 朋友、专家、老师、博主、普通人、子女 |
| 角色属性 | 性别 | 男、女、中性 |
| 角色属性 | 年龄 | 少年、青年、中年、老年 |
| 内容目的 | 目的 | 种草、科普、讲故事、带货、情感共鸣 |
| 情绪风格 | 情绪 | 轻松、严肃、温馨、激动、平静 |
| 内容风格 | 风格 | 幽默、专业、口语化、文艺、简洁 |
| 时长 | 时长 | 15秒、30秒、60秒、90秒 |
| 目标受众 | 受众 | 年轻人、职场人、学生、宝妈 |

> 属性通过字典管理，管理员可维护，用户也可手动填写

---

## 三、数据库模型

### 3.1 新增表

#### Project (作品表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| userId | UUID | 创建者 |
| tenantId | UUID | 租户 |
| title | String | 作品标题 |
| topic | String | 原始主题 |
| status | Enum | 草稿/进行中/已完成/已归档 |
| currentVersionId | UUID | 当前版本 |
| coverUrl | String | 封面图 |
| finalVideoUrl | String | 最终视频 |
| isPublic | Boolean | 是否公开 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### ProjectVersion (版本表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属作品 |
| parentVersionId | UUID? | 父版本（分支来源） |
| versionNo | Int | 版本号 |
| branchName | String? | 分支名称 |
| currentStep | Enum | 当前步骤 |
| isMain | Boolean | 是否主分支 |
| createdAt | DateTime | 创建时间 |

#### ProjectStep (步骤记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| versionId | UUID | 所属版本 |
| stepType | Enum | 步骤类型 |
| selectedOptionId | UUID? | 选中的选项 |
| attributes | Json | 文案属性等配置 |
| status | Enum | 待处理/生成中/已完成/失败/跳过 |
| createdAt | DateTime | 创建时间 |

#### StepOption (步骤选项表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| stepId | UUID | 所属步骤 |
| content | Text | 内容（标题/文案文本） |
| assetUrl | String? | 资源URL（图片/视频/音频） |
| metadata | Json | 元数据 |
| isSelected | Boolean | 是否被选中 |
| sortOrder | Int | 排序 |

#### AIModelConfig (AI模型配置表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| tenantId | UUID? | 租户（系统级为空） |
| userId | UUID? | 用户（用户级配置） |
| modelType | Enum | 类型：TEXT/IMAGE/VIDEO/VOICE |
| providerName | String | 提供商名称 |
| apiUrl | String | API 地址 |
| apiKey | String | API 密钥（加密存储） |
| modelName | String | 模型名称 |
| config | Json | 其他配置 |
| isDefault | Boolean | 是否默认 |
| isActive | Boolean | 是否启用 |
| priority | Int | 优先级 |

#### PromptTemplate (提示词模板表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| tenantId | UUID? | 租户 |
| userId | UUID? | 用户 |
| templateType | Enum | 类型：TITLE/COPYWRITING/IMAGE |
| name | String | 模板名称 |
| description | String | 模板描述 |
| category | String | 分类 |
| promptContent | Text | 提示词内容 |
| variables | Json | 变量定义 |
| isSystem | Boolean | 是否系统预设 |
| isActive | Boolean | 是否启用 |
| usageCount | Int | 使用次数 |

#### AIUsageLog (AI调用日志表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| tenantId | UUID | 租户 |
| userId | UUID | 用户 |
| projectId | UUID? | 关联作品 |
| modelType | Enum | 模型类型 |
| modelConfigId | UUID | 使用的配置 |
| inputTokens | Int | 输入 token |
| outputTokens | Int | 输出 token |
| cost | Decimal | 费用估算 |
| latencyMs | Int | 响应时间 |
| status | Enum | 成功/失败 |
| errorMessage | Text? | 错误信息 |
| createdAt | DateTime | 调用时间 |

### 3.2 新增枚举

```prisma
enum ProjectStatus {
  DRAFT
  IN_PROGRESS
  COMPLETED
  ARCHIVED
}

enum StepType {
  TOPIC_INPUT
  TITLE_GENERATE
  TITLE_SELECT
  ATTRIBUTE_SET
  COPY_GENERATE
  COPY_SELECT
  COPY_SEGMENT
  IMAGE_GENERATE
  IMAGE_SELECT
  VIDEO_GENERATE
  VIDEO_SELECT
  VOICE_CONFIG
  VOICE_GENERATE
  COMPOSE
}

enum StepStatus {
  PENDING
  GENERATING
  COMPLETED
  FAILED
  SKIPPED
}

enum AIModelType {
  TEXT
  IMAGE
  VIDEO
  VOICE
}

enum TemplateType {
  TITLE
  COPYWRITING
  IMAGE
}

enum AILogStatus {
  SUCCESS
  FAILED
}
```

---

## 四、API 接口设计

### 4.1 作品相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/projects` | 创建新作品 |
| GET | `/api/projects` | 获取作品列表 |
| GET | `/api/projects/[id]` | 获取作品详情 |
| PUT | `/api/projects/[id]` | 更新作品 |
| DELETE | `/api/projects/[id]` | 删除作品 |
| GET | `/api/projects/[id]/versions` | 获取版本列表 |
| POST | `/api/projects/[id]/versions` | 创建新版本（回溯） |
| PUT | `/api/projects/[id]/versions/[vid]` | 切换当前版本 |

### 4.2 AI 生成

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/titles` | 生成标题（N个） |
| POST | `/api/ai/copywriting` | 生成文案（N个） |
| POST | `/api/ai/images` | 生成图片（N个） |
| POST | `/api/ai/videos` | 生成视频（N个）- MVP 模拟 |
| POST | `/api/ai/voice` | 生成配音 - MVP 模拟 |
| POST | `/api/ai/compose` | 合成最终视频 - MVP 模拟 |

### 4.3 步骤操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/projects/[id]/steps` | 创建步骤记录 |
| PUT | `/api/projects/[id]/steps/[sid]` | 更新步骤 |
| POST | `/api/projects/[id]/steps/[sid]/regenerate` | 重新生成选项 |

### 4.4 配置管理（Admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/ai-config` | 获取 AI 配置列表 |
| POST | `/api/admin/ai-config` | 创建 AI 配置 |
| PUT | `/api/admin/ai-config/[id]` | 更新 AI 配置 |
| DELETE | `/api/admin/ai-config/[id]` | 删除 AI 配置 |
| GET | `/api/admin/templates` | 获取模板列表 |
| POST | `/api/admin/templates` | 创建模板 |
| PUT | `/api/admin/templates/[id]` | 更新模板 |
| GET | `/api/admin/ai-stats` | 获取使用统计 |
| GET | `/api/admin/ai-projects` | 获取所有用户作品 |

### 4.5 用户配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/ai-config` | 获取用户 AI 配置 |
| POST | `/api/user/ai-config` | 创建/更新用户配置 |

---

## 五、前端页面设计

### 5.1 路由结构

```
/                           # 首页 - 创作工作台
├── /projects               # 作品列表页
│   └── /projects/[id]      # 作品详情/编辑页
├── /admin                  # 后台管理
│   ├── /admin/ai-config    # AI 模型配置
│   ├── /admin/templates    # 提示词模板管理
│   ├── /admin/ai-stats     # AI 使用统计
│   └── /admin/ai-projects  # 作品审核管理
└── /login                  # 登录页
```

### 5.2 UI 设计规范

#### 色彩系统

| 用途 | 颜色 | Hex | Tailwind |
|------|------|-----|----------|
| 主色 | 蓝色 | #2563EB | `blue-600` |
| 次要 | 浅蓝 | #3B82F6 | `blue-500` |
| 强调/CTA | 橙色 | #F97316 | `orange-500` |
| 背景 | 浅灰 | #F8FAFC | `slate-50` |
| 文字 | 深灰 | #1E293B | `slate-800` |
| 边框 | 灰色 | #E2E8F0 | `slate-200` |
| 成功 | 绿色 | #10B981 | `emerald-500` |
| 警告 | 黄色 | #F59E0B | `amber-500` |
| 错误 | 红色 | #EF4444 | `red-500` |

#### 字体

```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
```

| 用途 | 字体 | 字重 |
|------|------|------|
| 标题 | Poppins | 600-700 |
| 正文 | Open Sans | 400-500 |
| 按钮 | Poppins | 500-600 |

#### 交互规范

| 元素 | 规范 |
|------|------|
| 按钮 | `rounded-lg` 圆角，hover 时颜色加深 |
| 卡片 | `rounded-xl shadow-sm` 轻阴影，hover 时 `shadow-md` |
| 选中态 | `border-2 border-blue-500` 蓝色边框 |
| 加载态 | Skeleton 骨架屏，`animate-pulse` |
| 过渡 | `transition-all duration-200` |
| 间距 | 统一使用 4 的倍数（4px, 8px, 16px, 24px, 32px） |

### 5.3 核心组件

| 组件 | 说明 |
|------|------|
| `StepIndicator` | 步骤进度指示器，可点击回溯 |
| `TopicInput` | 主题输入组件 |
| `TitleSelector` | 标题选择组件 |
| `AttributeForm` | 文案属性表单 |
| `CopySelector` | 文案选择组件 |
| `ImageSelector` | 图片选择组件 |
| `VideoSelector` | 视频选择组件 |
| `VoiceConfig` | 配音配置组件 |
| `ComposePreview` | 合成预览组件 |
| `ProjectCard` | 作品卡片 |
| `ProjectList` | 作品列表 |
| `VersionTree` | 版本分支树 |

---

## 六、文件结构

```
web/
├── prisma/
│   └── schema.prisma          # 新增 AI 视频相关模型
│
├── src/
│   ├── app/
│   │   ├── (main)/            # 前台路由组
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # 首页（创作工作台）
│   │   │   └── projects/
│   │   │       ├── page.tsx   # 作品列表
│   │   │       └── [id]/
│   │   │           └── page.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── ai-config/
│   │   │   ├── templates/
│   │   │   ├── ai-stats/
│   │   │   └── ai-projects/
│   │   │
│   │   └── api/
│   │       ├── projects/
│   │       ├── ai/
│   │       ├── user/
│   │       └── admin/
│   │
│   ├── components/
│   │   ├── studio/
│   │   │   ├── StepIndicator.tsx
│   │   │   ├── TopicInput.tsx
│   │   │   ├── TitleSelector.tsx
│   │   │   ├── AttributeForm.tsx
│   │   │   ├── CopySelector.tsx
│   │   │   ├── ImageSelector.tsx
│   │   │   ├── VideoSelector.tsx
│   │   │   ├── VoiceConfig.tsx
│   │   │   └── ComposePreview.tsx
│   │   │
│   │   └── projects/
│   │       ├── ProjectCard.tsx
│   │       ├── ProjectList.tsx
│   │       └── VersionTree.tsx
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── text-generator.ts
│   │   │   ├── image-generator.ts
│   │   │   ├── video-generator.ts
│   │   │   └── voice-generator.ts
│   │   │
│   │   └── services/
│   │       ├── project-service.ts
│   │       └── ai-config-service.ts
│   │
│   └── types/
│       └── ai-video.ts
```

---

## 七、实施阶段

### 阶段 1：数据库与基础

- [ ] 更新 Prisma Schema，添加新模型
- [ ] 执行数据库迁移
- [ ] 添加字典数据（文案属性选项）

### 阶段 2：AI 服务层

- [ ] 实现 AI 配置管理
- [ ] 实现文本生成服务（调用真实 API）
- [ ] 实现图片生成服务（调用真实 API）
- [ ] 实现视频/配音/合成服务（模拟）

### 阶段 3：API 层

- [ ] 实现作品 CRUD API
- [ ] 实现步骤管理 API
- [ ] 实现 AI 生成 API
- [ ] 实现管理后台 API

### 阶段 4：前端页面

- [ ] 实现首页创作工作台
- [ ] 实现各步骤组件
- [ ] 实现作品列表页
- [ ] 实现管理后台页面

### 阶段 5：完善与测试

- [ ] 版本回溯功能
- [ ] OSS 文件管理
- [ ] 使用统计
- [ ] 测试与优化

---

## 八、技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js (App Router) |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 认证 | NextAuth.js |
| 文件存储 | OSS |
| AI 接口 | OpenAI 协议兼容 |
