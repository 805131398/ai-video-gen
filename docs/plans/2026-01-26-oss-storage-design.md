# OSS 文件管理设计文档

> 创建日期: 2026-01-26
> 状态: 已确认

---

## 一、需求概述

### 1.1 功能目标

为 AI 视频创作工具提供统一的文件存储服务，支持多种云存储后端。

### 1.2 核心需求

| 需求 | 说明 |
|------|------|
| 多存储支持 | 阿里云 OSS、AWS S3、腾讯云 COS |
| 混合上传 | AI 生成内容 + 用户上传素材 + 参考素材 |
| 文件限制 | 图片 20MB，视频 500MB，音频 50MB |
| 上传方式 | 用户上传用客户端直传，AI 生成用服务端上传 |

### 1.3 目录结构

```
/{tenantId}/{businessType}/{YYYY-MM}/{uuid}.{ext}
```

示例：
- `/tenant123/project-images/2026-01/abc123.jpg`
- `/tenant123/project-videos/2026-01/def456.mp4`
- `/tenant123/ai-generated/2026-01/ghi789.png`

---

## 二、整体架构

### 2.1 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                      Storage Service                         │
├─────────────────────────────────────────────────────────────┤
│  StorageFactory  →  根据配置创建对应的存储适配器              │
│       ↓                                                      │
│  ┌─────────────┬─────────────┬─────────────┐                │
│  │ AliOSSAdapter│ S3Adapter  │ COSAdapter  │                │
│  └─────────────┴─────────────┴─────────────┘                │
│       ↓              ↓             ↓                        │
│  ┌─────────────────────────────────────────┐                │
│  │         IStorageAdapter 统一接口         │                │
│  │  - upload(file)                         │                │
│  │  - getSignedUrl(key, expires)           │                │
│  │  - getUploadSignedUrl(key, expires)     │                │
│  │  - delete(key)                          │                │
│  │  - exists(key)                          │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 文件结构

```
src/lib/storage/
├── index.ts              # 导出入口
├── types.ts              # 类型定义
├── storage-factory.ts    # 工厂类
├── adapters/
│   ├── base.ts           # 基础适配器接口
│   ├── ali-oss.ts        # 阿里云 OSS
│   ├── aws-s3.ts         # AWS S3
│   └── tencent-cos.ts    # 腾讯云 COS
└── utils.ts              # 工具函数
```

---

## 三、类型定义

### 3.1 存储类型

```typescript
// 存储提供商类型
export type StorageProviderType = 'ali-oss' | 'aws-s3' | 'tencent-cos';

// 业务类型
export type BusinessType =
  | 'project-images'    // 项目图片
  | 'project-videos'    // 项目视频
  | 'project-audio'     // 项目音频
  | 'ai-generated'      // AI 生成内容
  | 'user-uploads'      // 用户上传素材
  | 'avatars';          // 用户头像
```

### 3.2 文件限制

```typescript
export const FILE_LIMITS = {
  image: { maxSize: 20 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] },
  video: { maxSize: 500 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/quicktime'] },
  audio: { maxSize: 50 * 1024 * 1024, types: ['audio/mpeg', 'audio/wav', 'audio/ogg'] },
};
```

### 3.3 接口定义

```typescript
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface SignedUrlResult {
  url: string;
  key: string;
  expires: number;
}

export interface IStorageAdapter {
  upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult>;
  getUploadSignedUrl(key: string, mimeType: string, expiresIn?: number): Promise<SignedUrlResult>;
  getDownloadSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

---

## 四、API 设计

### 4.1 端点列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/storage/upload-url` | 获取客户端直传预签名 URL |
| POST | `/api/storage/callback` | 上传完成回调 |
| DELETE | `/api/storage/[id]` | 删除文件 |
| GET | `/api/storage/[id]/url` | 获取文件访问 URL |

### 4.2 客户端直传流程

```
前端 → 请求上传URL → 后端
前端 ← 返回预签名URL ← 后端
前端 → 直接上传文件 → OSS
前端 → 通知上传完成 → 后端
前端 ← 返回文件记录 ← 后端
```

---

## 五、前端组件

### 5.1 上传 Hook

```typescript
export function useFileUpload(options: {
  businessType: BusinessType;
  businessId?: string;
  onSuccess?: (file: FileRecord) => void;
  onError?: (error: Error) => void;
}) {
  return {
    upload: (file: File) => Promise<FileRecord>,
    uploadMultiple: (files: File[]) => Promise<FileRecord[]>,
    isUploading: boolean,
    progress: number,
    error: Error | null,
  };
}
```

### 5.2 组件

- `FileUploader` - 通用文件上传组件
- `DropZone` - 拖拽上传区域

---

## 六、存储配置

### 6.1 阿里云 OSS

```typescript
interface AliOSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
}
```

### 6.2 AWS S3

```typescript
interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}
```

### 6.3 腾讯云 COS

```typescript
interface COSConfig {
  region: string;
  secretId: string;
  secretKey: string;
  bucket: string;
}
```

---

## 七、实现计划

- [x] 核心服务层 - 统一接口 + 阿里云 OSS 适配器
- [x] API 路由 - 预签名 URL + 回调接口
- [x] 前端组件 - FileUploader + DropZone + useFileUpload
- [x] 其他适配器 - S3、COS
- [ ] 管理页面 - 存储配置管理
