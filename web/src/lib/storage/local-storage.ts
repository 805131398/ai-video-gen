import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);

/**
 * 本地文件存储服务
 * 用于桌面应用的本地文件管理
 */
export class LocalStorageService {
  private storagePath: string;

  constructor(storagePath?: string) {
    // 从环境变量获取存储路径，或使用默认路径
    this.storagePath = storagePath || process.env.STORAGE_PATH || path.join(process.cwd(), 'storage');
    this.ensureStorageDir();
  }

  /**
   * 确保存储目录存在
   */
  private async ensureStorageDir() {
    try {
      await stat(this.storagePath);
    } catch (error) {
      await mkdir(this.storagePath, { recursive: true });
    }
  }

  /**
   * 确保子目录存在
   */
  private async ensureDir(dirPath: string) {
    try {
      await stat(dirPath);
    } catch (error) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 上传文件（保存到本地）
   */
  async upload(
    file: Buffer | string,
    fileName: string,
    options?: {
      folder?: string;
      contentType?: string;
    }
  ): Promise<{ url: string; path: string }> {
    const folder = options?.folder || 'uploads';
    const folderPath = path.join(this.storagePath, folder);

    await this.ensureDir(folderPath);

    // 生成唯一文件名
    const timestamp = Date.now();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const uniqueFileName = `${baseName}_${timestamp}${ext}`;

    const filePath = path.join(folderPath, uniqueFileName);

    // 写入文件
    if (Buffer.isBuffer(file)) {
      await writeFile(filePath, file);
    } else {
      // 如果是文件路径，复制文件
      const sourceBuffer = await readFile(file);
      await writeFile(filePath, sourceBuffer);
    }

    // 返回相对路径作为 URL
    const relativePath = path.relative(this.storagePath, filePath);
    const url = `/storage/${relativePath.replace(/\\/g, '/')}`;

    return {
      url,
      path: filePath,
    };
  }

  /**
   * 删除文件
   */
  async delete(filePath: string): Promise<void> {
    try {
      // 如果是 URL 格式，转换为实际路径
      let actualPath = filePath;
      if (filePath.startsWith('/storage/')) {
        actualPath = path.join(this.storagePath, filePath.replace('/storage/', ''));
      }

      await unlink(actualPath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * 获取文件
   */
  async get(filePath: string): Promise<Buffer> {
    try {
      // 如果是 URL 格式，转换为实际路径
      let actualPath = filePath;
      if (filePath.startsWith('/storage/')) {
        actualPath = path.join(this.storagePath, filePath.replace('/storage/', ''));
      }

      return await readFile(actualPath);
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      let actualPath = filePath;
      if (filePath.startsWith('/storage/')) {
        actualPath = path.join(this.storagePath, filePath.replace('/storage/', ''));
      }

      await stat(actualPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string) {
    try {
      let actualPath = filePath;
      if (filePath.startsWith('/storage/')) {
        actualPath = path.join(this.storagePath, filePath.replace('/storage/', ''));
      }

      const stats = await stat(actualPath);
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

  /**
   * 获取存储路径
   */
  getStoragePath(): string {
    return this.storagePath;
  }
}

// 导出单例
export const localStorageService = new LocalStorageService();
