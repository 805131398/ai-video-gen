# 项目角色管理 - 头像上传与 AI 生成功能

> 更新时间：2026-01-28
> 状态：✅ 已完成

## 功能概述

在原有的项目角色管理基础上，新增了两个重要功能：
1. **角色头像上传** - 支持为角色上传自定义头像图片
2. **AI 生成角色描述** - 使用 AI 自动生成详细的角色描述

## 1. 角色头像上传功能

### 功能特性

- 支持图片格式：JPG、PNG、WEBP、GIF
- 文件大小限制：最大 5MB
- 上传进度显示
- 头像预览
- 删除头像功能
- 云存储集成（阿里云 OSS / AWS S3 / 腾讯云 COS）

### 实现文件

#### 前端

**storage.ts** - 文件上传服务
```typescript
// 位置：client/src/services/storage.ts

// 主要函数
getUploadUrl()      // 获取预签名 URL
uploadFile()        // 上传文件到云存储
uploadAvatar()      // 上传头像（专用）
```

**CharacterForm.tsx** - 表单组件更新
- 添加头像上传区域
- 文件选择器
- 上传进度显示
- 头像预览和删除

**CharacterCard.tsx** - 卡片组件更新
- 显示角色头像
- 无头像时显示默认图标

#### 后端

使用现有的文件上传 API：
```
POST /api/storage/upload-url
```

参数：
```json
{
  "filename": "avatar.jpg",
  "mimeType": "image/jpeg",
  "size": 102400,
  "businessType": "avatars"
}
```

### 使用流程

1. 用户点击头像上传区域或"上传头像"按钮
2. 选择图片文件
3. 前端验证文件类型和大小
4. 调用 `/api/storage/upload-url` 获取预签名 URL
5. 直接上传到云存储（显示进度）
6. 上传成功后显示头像预览
7. 保存角色时将头像 URL 存入数据库

### UI 设计

**头像上传区域**：
- 圆形头像显示（直径 96px）
- 虚线边框的上传占位符
- 上传进度百分比显示
- 删除按钮（右上角）

**角色卡片头像**：
- 圆形头像（直径 48px）
- 默认图标（User 图标）
- 对象适配（object-cover）

## 2. AI 生成角色描述功能

### 功能特性

- 根据角色名称自动生成描述
- 结合项目主题生成符合风格的描述
- 生成内容包含：外貌、年龄、性格、穿着等
- 适合用于 AI 图像生成
- 字数控制在 50-150 字

### 实现文件

#### 后端 API

**generate-description/route.ts**
```typescript
// 位置：web/src/app/api/projects/[id]/characters/generate-description/route.ts

POST /api/projects/{projectId}/characters/generate-description
```

**请求参数**：
```json
{
  "characterName": "健康专家"
}
```

**响应**：
```json
{
  "description": "40岁左右的女性医生，温和亲切的笑容，戴着金丝边眼镜。穿着整洁的白大褂，胸前别着工作牌。短发干练，气质专业而平易近人。手持听诊器，眼神专注而温暖，给人以信赖感。"
}
```

**AI 提示词设计**：
```
系统提示：你是一个专业的角色设定专家。

要求：
1. 描述要具体、生动，包含外貌、年龄、性格、穿着等特征
2. 描述要符合项目主题风格
3. 描述要适合用于 AI 图像生成，保持角色一致性
4. 字数控制在 50-150 字之间
5. 只输出角色描述内容，不要其他说明

用户提示：
项目主题：{themeName}
主题描述：{themeDesc}
角色名称：{characterName}
```

#### 前端

**project.ts** - 服务层
```typescript
// 位置：client/src/services/project.ts

generateCharacterDescription(projectId: string, characterName: string): Promise<string>
```

**CharacterForm.tsx** - 表单组件
- 添加"AI 生成"按钮（渐变紫粉色）
- Sparkles 图标
- 生成中状态显示
- 自动填充描述字段

### 使用流程

1. 用户输入角色名称（必填）
2. 点击"AI 生成"按钮
3. 前端验证角色名称不为空
4. 调用 AI 生成 API
5. 后端获取项目主题信息
6. 构建 AI 提示词
7. 调用 AI 模型生成描述
8. 返回生成的描述
9. 自动填充到描述输入框
10. 用户可以编辑调整

### UI 设计

**AI 生成按钮**：
- 位置：描述字段标签右侧
- 样式：渐变背景（紫色到粉色）
- 图标：Sparkles（闪光）
- 文字：AI 生成 / AI 生成中...
- 禁用条件：角色名称为空或正在生成

### 生成示例

**输入**：
- 项目主题：健康养生
- 角色名称：健康专家

**输出**：
```
40岁左右的女性医生，温和亲切的笑容，戴着金丝边眼镜。穿着整洁的白大褂，
胸前别着工作牌。短发干练，气质专业而平易近人。手持听诊器，眼神专注而温暖，
给人以信赖感。
```

**输入**：
- 项目主题：文旅探索
- 角色名称：旅游博主

**输出**：
```
25岁年轻女性，活泼开朗的笑容，扎着高马尾。穿着休闲的牛仔外套和白色T恤，
背着复古相机。肩上挎着帆布包，手持自拍杆。眼神充满好奇和探索欲，
整体造型时尚又接地气。
```

## 技术实现细节

### 文件上传流程

```
1. 前端选择文件
   ↓
2. 调用 /api/storage/upload-url
   ↓
3. 后端生成预签名 URL
   ↓
4. 前端直接上传到云存储
   ↓
5. 上传成功，获得文件 URL
   ↓
6. 保存 URL 到数据库
```

### AI 生成流程

```
1. 用户输入角色名称
   ↓
2. 点击 AI 生成按钮
   ↓
3. 前端调用 API
   ↓
4. 后端获取项目主题
   ↓
5. 构建 AI 提示词
   ↓
6. 调用 AI 模型
   ↓
7. 返回生成结果
   ↓
8. 前端填充描述字段
```

## 数据库字段

角色表（project_characters）已有字段：
```sql
avatar_url VARCHAR(500)  -- 头像 URL
description TEXT         -- 角色描述
```

## API 接口汇总

### 文件上传
```
POST /api/storage/upload-url
```

### AI 生成描述
```
POST /api/projects/{projectId}/characters/generate-description
```

### 角色 CRUD
```
GET    /api/projects/{projectId}/characters
POST   /api/projects/{projectId}/characters
GET    /api/projects/{projectId}/characters/{characterId}
PUT    /api/projects/{projectId}/characters/{characterId}
DELETE /api/projects/{projectId}/characters/{characterId}
```

## 错误处理

### 文件上传错误

- 文件类型不支持：`只能上传图片文件`
- 文件过大：`图片大小不能超过 5MB`
- 上传失败：`上传失败，请重试`

### AI 生成错误

- 角色名称为空：`请先输入角色名称`
- AI 配置缺失：`未找到可用的 AI 配置`
- 生成失败：`AI 生成失败，请重试`

## 性能优化

1. **文件上传**
   - 直传云存储，不经过服务器
   - 显示上传进度
   - 文件大小限制

2. **AI 生成**
   - 温度参数：0.7（平衡创造性和稳定性）
   - 字数限制：50-150 字
   - 超时处理

## 安全考虑

1. **文件上传**
   - 文件类型验证
   - 文件大小限制
   - 预签名 URL 有效期限制
   - 业务类型隔离（avatars）

2. **AI 生成**
   - 用户认证
   - 项目所有权验证
   - 输入内容验证
   - API 调用频率限制（建议添加）

## 后续优化建议

1. **头像功能**
   - 添加图片裁剪功能
   - 支持从摄像头拍照
   - 头像模板库
   - 批量上传

2. **AI 生成功能**
   - 生成多个版本供选择
   - 保存生成历史
   - 自定义生成风格
   - 根据头像生成描述

3. **用户体验**
   - 拖拽上传
   - 粘贴上传
   - AI 生成预览
   - 撤销/重做功能

## 相关文档

- [项目角色管理-前端实现](./项目角色管理-前端实现.md)
- [项目主题与角色管理功能](./project-theme-and-characters.md)
