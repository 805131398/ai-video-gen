# 项目主题与角色管理功能

> 创建时间：2026-01-28
> 版本：v1.0.0
> 状态：已实现

## 功能概述

为 AI 视频生成平台添加项目主题和角色管理功能，支持用户在创建视频项目时：
1. 定义项目主题（如健康、文旅、美食等），作为内容生成的主旋律
2. 创建多个角色，每个角色有独立的描述和属性，用于保持视频生成时的角色一致性
3. 在调用 AI 生图、生视频、文案生成等接口时，自动结合主题和角色信息

## 数据库设计

### 1. ProjectTheme（项目主题表）

```prisma
model ProjectTheme {
  id          String    @id @default(uuid())
  name        String    // 主题名称（健康、文旅、美食等）
  description String?   // 主题描述
  keywords    String[]  // 关键词
  isActive    Boolean   @default(true) @map("is_active")
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  projects Project[]

  @@map("project_themes")
}
```

**字段说明：**
- `name`: 主题名称，如"健康养生"、"文旅探索"、"美食推荐"
- `description`: 主题的详细描述
- `keywords`: 关键词数组，用于 AI 生成时的提示词增强
- `isActive`: 是否启用该主题
- `sortOrder`: 排序权重，用于前端展示排序

### 2. ProjectCharacter（项目角色表）

```prisma
model ProjectCharacter {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  name        String   // 角色名称
  description String   @db.Text // 角色描述（用于生成时保持一致性）
  avatarUrl   String?  @map("avatar_url") // 角色头像
  attributes  Json?    // 角色属性（年龄、性别、外貌特征等）
  sortOrder   Int      @default(0) @map("sort_order")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("project_characters")
}
```

**字段说明：**
- `projectId`: 所属项目 ID
- `name`: 角色名称，如"健康专家"、"旅游博主"
- `description`: 角色的详细描述，包含外貌、性格、穿着等特征
- `avatarUrl`: 角色头像图片 URL（可选）
- `attributes`: JSON 格式的角色属性，如 `{ "age": "中年", "gender": "女", "profession": "医生" }`
- `sortOrder`: 角色排序，主角通常为 0

### 3. Project 模型扩展

在原有 `Project` 模型基础上添加了以下字段：

```prisma
model Project {
  // ... 原有字段

  // 主题相关字段
  themeId          String?       @map("theme_id")
  themeName        String?       @map("theme_name")
  themeDesc        String?       @map("theme_desc") @db.Text

  // 关联
  theme      ProjectTheme?      @relation(fields: [themeId], references: [id])
  characters ProjectCharacter[]
}
```

**设计说明：**
- 支持两种主题模式：
  1. 关联预定义主题（使用 `themeId`）
  2. 自定义主题（使用 `themeName` 和 `themeDesc`）
- 一个项目可以有多个角色（一对多关系）

## API 接口

### 项目主题管理

#### 1. 获取主题列表

```http
GET /api/project-themes?isActive=true
```

**响应示例：**
```json
{
  "data": [
    {
      "id": "theme-uuid-1",
      "name": "健康养生",
      "description": "关注健康生活方式和养生知识",
      "keywords": ["健康", "养生", "运动", "饮食"],
      "isActive": true,
      "sortOrder": 0,
      "createdAt": "2026-01-28T05:00:00Z",
      "updatedAt": "2026-01-28T05:00:00Z"
    }
  ]
}
```

#### 2. 创建主题

```http
POST /api/project-themes
Content-Type: application/json

{
  "name": "文旅探索",
  "description": "介绍各地旅游景点和文化特色",
  "keywords": ["旅游", "景点", "美食", "文化"],
  "sortOrder": 1
}
```

#### 3. 更新主题

```http
PUT /api/project-themes/{id}
Content-Type: application/json

{
  "description": "更新后的描述",
  "isActive": false
}
```

#### 4. 删除主题

```http
DELETE /api/project-themes/{id}
```

**注意：** 如果有项目正在使用该主题，删除会失败并返回错误信息。

### 项目角色管理

#### 1. 获取项目角色列表

```http
GET /api/projects/{projectId}/characters
```

**响应示例：**
```json
{
  "data": [
    {
      "id": "char-uuid-1",
      "projectId": "project-uuid",
      "name": "健康专家",
      "description": "40岁左右的女性医生，温和亲切，穿白大褂，戴眼镜",
      "avatarUrl": "https://example.com/avatar.jpg",
      "attributes": {
        "age": "中年",
        "gender": "女",
        "profession": "医生",
        "personality": "温和亲切"
      },
      "sortOrder": 0,
      "createdAt": "2026-01-28T05:00:00Z",
      "updatedAt": "2026-01-28T05:00:00Z"
    }
  ]
}
```

#### 2. 创建角色

```http
POST /api/projects/{projectId}/characters
Content-Type: application/json

{
  "name": "健康专家",
  "description": "40岁左右的女性医生，温和亲切，穿白大褂，戴眼镜",
  "attributes": {
    "age": "中年",
    "gender": "女",
    "profession": "医生"
  },
  "sortOrder": 0
}
```

#### 3. 更新角色

```http
PUT /api/projects/{projectId}/characters/{characterId}
Content-Type: application/json

{
  "description": "更新后的角色描述",
  "attributes": {
    "age": "中年",
    "gender": "女",
    "profession": "医生",
    "personality": "专业严谨"
  }
}
```

#### 4. 删除角色

```http
DELETE /api/projects/{projectId}/characters/{characterId}
```

### 项目创建/更新（增强）

#### 1. 创建项目（支持主题和角色）

```http
POST /api/projects
Content-Type: application/json

{
  "topic": "健康养生知识分享",
  "themeId": "theme-uuid-1",
  "characters": [
    {
      "name": "健康专家",
      "description": "40岁左右的女性医生，温和亲切，穿白大褂",
      "attributes": {
        "age": "中年",
        "gender": "女",
        "profession": "医生"
      },
      "sortOrder": 0
    },
    {
      "name": "患者",
      "description": "30岁男性，普通上班族",
      "attributes": {
        "age": "青年",
        "gender": "男"
      },
      "sortOrder": 1
    }
  ]
}
```

**或使用自定义主题：**

```http
POST /api/projects
Content-Type: application/json

{
  "topic": "旅游攻略分享",
  "themeName": "文旅探索",
  "themeDesc": "介绍各地旅游景点和美食文化",
  "characters": [
    {
      "name": "旅游博主",
      "description": "25岁年轻女性，活泼开朗，休闲装扮",
      "sortOrder": 0
    }
  ]
}
```

#### 2. 获取项目详情（包含主题和角色）

```http
GET /api/projects/{id}
```

**响应示例：**
```json
{
  "id": "project-uuid",
  "topic": "健康养生知识分享",
  "title": null,
  "status": "DRAFT",
  "currentStep": "TOPIC_INPUT",
  "currentVersion": {
    "id": "version-uuid",
    "versionNo": 1
  },
  "theme": {
    "id": "theme-uuid-1",
    "name": "健康养生",
    "description": "关注健康生活方式和养生知识"
  },
  "characters": [
    {
      "id": "char-uuid-1",
      "name": "健康专家",
      "description": "40岁左右的女性医生，温和亲切，穿白大褂",
      "avatarUrl": null,
      "attributes": {
        "age": "中年",
        "gender": "女",
        "profession": "医生"
      }
    }
  ],
  "steps": {
    "topic": { "value": "健康养生知识分享" },
    "titles": null,
    "attributes": null,
    "copies": null,
    "images": null,
    "videos": null,
    "voice": null,
    "compose": null
  }
}
```

#### 3. 更新项目（支持主题）

```http
PUT /api/projects/{id}
Content-Type: application/json

{
  "title": "更新后的标题",
  "themeId": "new-theme-uuid",
  "themeName": "新主题名称",
  "themeDesc": "新主题描述"
}
```

## TypeScript 类型定义

### 新增类型

```typescript
// 项目主题
export interface ProjectTheme {
  id: string;
  name: string;
  description?: string | null;
  keywords?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// 项目角色
export interface ProjectCharacter {
  id: string;
  projectId: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  attributes?: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
```

### 更新的类型

```typescript
// Project 接口扩展
export interface Project {
  // ... 原有字段

  // 主题相关
  themeId?: string | null;
  themeName?: string | null;
  themeDesc?: string | null;

  // Relations
  theme?: ProjectTheme | null;
  characters?: ProjectCharacter[];
}

// 创建项目请求
export interface CreateProjectRequest {
  topic: string;
  title?: string;
  themeId?: string;
  themeName?: string;
  themeDesc?: string;
  characters?: Array<{
    name: string;
    description: string;
    avatarUrl?: string;
    attributes?: Record<string, unknown>;
    sortOrder?: number;
  }>;
}

// 项目页面响应
export interface ProjectPageResponse {
  // ... 原有字段

  theme?: {
    id: string | null;
    name: string;
    description?: string | null;
  } | null;
  characters?: Array<{
    id: string;
    name: string;
    description: string;
    avatarUrl?: string | null;
    attributes?: Record<string, unknown> | null;
  }>;
}
```

## 使用场景

### 场景 1：健康养生视频

```typescript
// 1. 创建项目
const project = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    topic: '如何预防感冒',
    themeId: 'health-theme-id',
    characters: [
      {
        name: '健康专家',
        description: '40岁女性医生，温和专业，穿白大褂',
        attributes: {
          age: '中年',
          gender: '女',
          profession: '医生'
        }
      }
    ]
  })
});

// 2. 生成文案时，AI 会自动结合主题和角色
// 提示词会包含：主题（健康养生）+ 角色（专业医生）
```

### 场景 2：旅游攻略视频

```typescript
const project = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    topic: '成都三日游攻略',
    themeName: '文旅探索',
    themeDesc: '介绍各地旅游景点和美食文化',
    characters: [
      {
        name: '旅游博主',
        description: '25岁女性，活泼开朗，休闲装扮，背着相机',
        attributes: {
          age: '青年',
          gender: '女',
          style: '活泼'
        }
      }
    ]
  })
});
```

### 场景 3：多角色对话视频

```typescript
const project = await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({
    topic: '职场沟通技巧',
    themeName: '职场技能',
    characters: [
      {
        name: '职场导师',
        description: '35岁男性，成熟稳重，商务正装',
        sortOrder: 0
      },
      {
        name: '职场新人',
        description: '22岁女性，青涩好学，休闲职业装',
        sortOrder: 1
      }
    ]
  })
});
```

## 与 AI 接口集成

### 1. 文案生成集成

在调用文案生成 API 时，自动注入主题和角色信息：

```typescript
// 伪代码示例
async function generateCopywriting(projectId: string, title: string) {
  const project = await getProject(projectId);

  const prompt = `
    主题：${project.theme?.name || project.themeName}
    主题描述：${project.theme?.description || project.themeDesc}

    角色设定：
    ${project.characters?.map(char => `
      - ${char.name}: ${char.description}
    `).join('\n')}

    请基于以上主题和角色，为标题"${title}"生成文案...
  `;

  return await callAI(prompt);
}
```

### 2. 图片生成集成

在生成图片时，使用角色描述保持一致性：

```typescript
async function generateImage(projectId: string, scene: string) {
  const project = await getProject(projectId);
  const mainCharacter = project.characters?.[0]; // 主角

  const prompt = `
    场景：${scene}
    主题风格：${project.theme?.name}

    角色外观：${mainCharacter?.description}

    请生成符合以上要求的图片...
  `;

  return await callImageAI(prompt);
}
```

### 3. 视频生成集成

```typescript
async function generateVideo(projectId: string, images: string[]) {
  const project = await getProject(projectId);

  // 在视频生成参数中包含角色一致性要求
  const params = {
    images,
    characterConsistency: {
      enabled: true,
      characters: project.characters?.map(char => ({
        name: char.name,
        description: char.description,
        attributes: char.attributes
      }))
    },
    themeStyle: project.theme?.name
  };

  return await callVideoAI(params);
}
```

## 数据库迁移

### 执行迁移

```bash
# 开发环境
cd web
pnpm db:push

# 或创建迁移文件
pnpm db:migrate
```

### 迁移内容

1. 创建 `project_themes` 表
2. 创建 `project_characters` 表
3. 在 `projects` 表添加字段：
   - `theme_id`
   - `theme_name`
   - `theme_desc`

## 前端实现建议

### 1. 项目创建流程

```
1. 选择/创建主题
   ├─ 从预定义主题列表选择
   └─ 或输入自定义主题名称和描述

2. 定义角色（可选）
   ├─ 添加主角
   ├─ 添加配角（可选）
   └─ 为每个角色设置：
      ├─ 名称
      ├─ 详细描述
      ├─ 头像（可选）
      └─ 属性标签

3. 输入主题内容
   └─ 开始视频创作流程
```

### 2. 角色管理界面

- 角色卡片展示（头像 + 名称 + 描述）
- 支持拖拽排序
- 快速编辑/删除
- 角色预览功能

### 3. 主题选择器

- 预定义主题网格展示
- 主题搜索功能
- 自定义主题输入框
- 主题关键词标签

## 注意事项

1. **角色一致性**：角色描述应该详细且具体，包含外貌、年龄、穿着、性格等特征
2. **主题关键词**：主题关键词会影响 AI 生成效果，应该精心选择
3. **性能优化**：项目详情 API 会关联查询主题和角色，注意数据量控制
4. **权限控制**：确保用户只能管理自己项目的角色
5. **级联删除**：删除项目时会自动删除关联的角色（onDelete: Cascade）

## 后续优化方向

1. **角色模板库**：提供常用角色模板供用户快速选择
2. **主题推荐**：基于用户历史创作推荐合适的主题
3. **角色一致性检测**：AI 检测生成内容中角色是否保持一致
4. **多语言支持**：主题和角色描述支持多语言
5. **角色关系图**：可视化展示多角色之间的关系

## 相关文件

### 数据库
- `web/prisma/schema.prisma` - Prisma 模型定义

### API 路由
- `web/src/app/api/project-themes/route.ts` - 主题列表 API
- `web/src/app/api/project-themes/[id]/route.ts` - 单个主题 API
- `web/src/app/api/projects/[id]/characters/route.ts` - 角色列表 API
- `web/src/app/api/projects/[id]/characters/[characterId]/route.ts` - 单个角色 API
- `web/src/app/api/projects/route.ts` - 项目创建 API（已更新）
- `web/src/app/api/projects/[id]/route.ts` - 项目详情 API（已更新）

### 类型定义
- `web/src/types/ai-video.ts` - TypeScript 类型定义

## 版本历史

- **v1.0.0** (2026-01-28)
  - 初始实现
  - 支持项目主题管理
  - 支持项目角色管理
  - 集成到项目创建流程
