// Storage Types Definition

// 存储提供商类型
export type StorageProviderType = 'ali-oss' | 'aws-s3' | 'tencent-cos';

// 业务类型（用于目录分类）
export type BusinessType =
  | 'project-images'    // 项目图片
  | 'project-videos'    // 项目视频
  | 'project-audio'     // 项目音频
  | 'ai-generated'      // AI 生成内容
  | 'user-uploads'      // 用户上传素材
  | 'avatars';          // 用户头像

// 文件类别
export type FileCategory = 'image' | 'video' | 'audio';

// 文件上传限制配置
export const FILE_LIMITS: Record<FileCategory, { maxSize: number; types: string[] }> = {
  image: {
    maxSize: 20 * 1024 * 1024, // 20MB
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  video: {
    maxSize: 500 * 1024 * 1024, // 500MB
    types: ['video/mp4', 'video/webm', 'video/quicktime'],
  },
  audio: {
    maxSize: 50 * 1024 * 1024, // 50MB
    types: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
  },
};

// 上传结果
export interface UploadResult {
  key: string;        // 存储 key
  url: string;        // 访问 URL
  size: number;       // 文件大小
  mimeType: string;   // MIME 类型
}

// 预签名 URL 结果
export interface SignedUrlResult {
  url: string;        // 预签名 URL
  key: string;        // 存储 key
  expires: number;    // 过期时间戳
}

// 阿里云 OSS 配置
export interface AliOSSConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
}

// AWS S3 配置
export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
}

// 腾讯云 COS 配置
export interface COSConfig {
  region: string;
  secretId: string;
  secretKey: string;
  bucket: string;
}

// 统一存储配置类型
export type StorageConfig = AliOSSConfig | S3Config | COSConfig;

// 存储提供商完整配置
export interface StorageProviderConfig {
  type: StorageProviderType;
  config: StorageConfig;
}

// 文件记录（对应数据库 File 表）
export interface FileRecord {
  id: string;
  providerId: string;
  originalName: string;
  storageKey: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  businessType?: string;
  businessId?: string;
  createdAt: Date | string;
}

// 上传请求参数
export interface UploadUrlRequest {
  filename: string;
  mimeType: string;
  size: number;
  businessType: BusinessType;
  businessId?: string;
}

// 上传回调请求参数
export interface UploadCallbackRequest {
  key: string;
  size: number;
  mimeType: string;
  originalName: string;
  businessType: BusinessType;
  businessId?: string;
}
