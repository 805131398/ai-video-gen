// Storage Adapter Base Interface

import { UploadResult, SignedUrlResult } from '../types';

/**
 * 存储适配器统一接口
 * 所有云存储提供商都需要实现此接口
 */
export interface IStorageAdapter {
  /**
   * 服务端上传文件
   * @param buffer 文件内容
   * @param key 存储路径
   * @param mimeType MIME 类型
   */
  upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult>;

  /**
   * 获取客户端直传预签名 URL
   * @param key 存储路径
   * @param mimeType MIME 类型
   * @param expiresIn 过期时间（秒），默认 3600
   */
  getUploadSignedUrl(key: string, mimeType: string, expiresIn?: number): Promise<SignedUrlResult>;

  /**
   * 获取文件下载/访问 URL
   * @param key 存储路径
   * @param expiresIn 过期时间（秒），默认 3600
   */
  getDownloadSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * 删除文件
   * @param key 存储路径
   */
  delete(key: string): Promise<void>;

  /**
   * 检查文件是否存在
   * @param key 存储路径
   */
  exists(key: string): Promise<boolean>;

  /**
   * 获取文件公开访问 URL（如果 bucket 配置了公开访问）
   * @param key 存储路径
   */
  getPublicUrl(key: string): string;
}
