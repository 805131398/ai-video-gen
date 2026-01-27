// Local Storage Adapter for Desktop App
import { IStorageAdapter } from './base';
import { UploadResult, SignedUrlResult } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

/**
 * 本地文件系统存储适配器
 * 用于桌面应用的本地文件存储
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private storagePath: string;
  private baseUrl: string;

  constructor(storagePath?: string) {
    // 从环境变量获取存储路径，或使用默认路径
    this.storagePath = storagePath || process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
    this.baseUrl = '/api/storage';
    this.ensureStorageDir();
  }

  /**
   * 确保存储目录存在
   */
  private async ensureStorageDir() {
    try {
      if (!existsSync(this.storagePath)) {
        await fs.mkdir(this.storagePath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create storage directory:', error);
    }
  }

  /**
   * 确保子目录存在
   */
  private async ensureDir(dirPath: string) {
    try {
      if (!existsSync(dirPath)) {
        await fs.mkdir(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  }

  /**
   * 从 key 中提取目录路径
   */
  private getDirectoryFromKey(key: string): string {
    const dir = path.dirname(key);
    return path.join(this.storagePath, dir);
  }

  /**
   * 获取完整文件路径
   */
  private getFullPath(key: string): string {
    return path.join(this.storagePath, key);
  }

  /**
   * 服务端上传文件
   */
  async upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    try {
      // 确保目录存在
      const dir = this.getDirectoryFromKey(key);
      await this.ensureDir(dir);

      // 写入文件
      const fullPath = this.getFullPath(key);
      await fs.writeFile(fullPath, buffer);

      // 返回结果
      const url = `${this.baseUrl}/${key.replace(/\\/g, '/')}`;
      return {
        key,
        url,
        size: buffer.length,
        mimeType,
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * 获取客户端直传预签名 URL
   * 注意：本地存储不需要预签名，返回一个虚拟的上传端点
   */
  async getUploadSignedUrl(key: string, mimeType: string, expiresIn: number = 3600): Promise<SignedUrlResult> {
    // 本地存储不需要预签名，返回一个标准的上传 API 端点
    const expires = Date.now() + expiresIn * 1000;
    return {
      url: `/api/upload/direct?key=${encodeURIComponent(key)}&mimeType=${encodeURIComponent(mimeType)}`,
      key,
      expires,
    };
  }

  /**
   * 获取文件下载/访问 URL
   */
  async getDownloadSignedUrl(key: string, expiresIn?: number): Promise<string> {
    // 本地存储直接返回访问 URL，不需要签名
    return this.getPublicUrl(key);
  }

  /**
   * 删除文件
   */
  async delete(key: string): Promise<void> {
    try {
      const fullPath = this.getFullPath(key);
      if (existsSync(fullPath)) {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(key);
      return existsSync(fullPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件公开访问 URL
   */
  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key.replace(/\\/g, '/')}`;
  }

  /**
   * 获取存储路径
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string) {
    try {
      const fullPath = this.getFullPath(key);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }
}
