// Storage Factory - 根据配置创建对应的存储适配器

import { IStorageAdapter } from './adapters/base';
import { AliOSSAdapter } from './adapters/ali-oss';
import { S3Adapter } from './adapters/aws-s3';
import { COSAdapter } from './adapters/tencent-cos';
import {
  StorageProviderType,
  StorageProviderConfig,
  AliOSSConfig,
  S3Config,
  COSConfig,
  BusinessType,
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class StorageFactory {
  private static instance: IStorageAdapter | null = null;
  private static config: StorageProviderConfig | null = null;

  /**
   * 初始化存储适配器
   */
  static initialize(config: StorageProviderConfig): void {
    this.config = config;
    this.instance = this.createAdapter(config);
  }

  /**
   * 获取存储适配器实例
   */
  static getAdapter(): IStorageAdapter {
    if (!this.instance) {
      throw new Error('Storage adapter not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  /**
   * 创建适配器实例
   */
  private static createAdapter(config: StorageProviderConfig): IStorageAdapter {
    switch (config.type) {
      case 'ali-oss':
        return new AliOSSAdapter(config.config as AliOSSConfig);
      case 'aws-s3':
        return new S3Adapter(config.config as S3Config);
      case 'tencent-cos':
        return new COSAdapter(config.config as COSConfig);
      default:
        throw new Error(`Unsupported storage provider: ${config.type}`);
    }
  }

  /**
   * 生成存储 key
   * 格式: /{tenantId}/{businessType}/{YYYY-MM}/{uuid}.{ext}
   */
  static generateKey(
    tenantId: string,
    businessType: BusinessType,
    filename: string
  ): string {
    const ext = filename.split('.').pop() || '';
    const date = new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const uuid = uuidv4();
    return `${tenantId}/${businessType}/${yearMonth}/${uuid}.${ext}`;
  }

  /**
   * 从环境变量加载配置并初始化
   */
  static initializeFromEnv(): void {
    const providerType = process.env.STORAGE_PROVIDER as StorageProviderType;

    if (!providerType) {
      throw new Error('STORAGE_PROVIDER environment variable is not set');
    }

    let config: StorageProviderConfig;

    switch (providerType) {
      case 'ali-oss':
        config = {
          type: 'ali-oss',
          config: {
            region: process.env.ALI_OSS_REGION!,
            accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID!,
            accessKeySecret: process.env.ALI_OSS_ACCESS_KEY_SECRET!,
            bucket: process.env.ALI_OSS_BUCKET!,
            endpoint: process.env.ALI_OSS_ENDPOINT,
          },
        };
        break;
      case 'aws-s3':
        config = {
          type: 'aws-s3',
          config: {
            region: process.env.AWS_S3_REGION!,
            accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
            bucket: process.env.AWS_S3_BUCKET!,
            endpoint: process.env.AWS_S3_ENDPOINT,
          },
        };
        break;
      case 'tencent-cos':
        config = {
          type: 'tencent-cos',
          config: {
            region: process.env.TENCENT_COS_REGION!,
            secretId: process.env.TENCENT_COS_SECRET_ID!,
            secretKey: process.env.TENCENT_COS_SECRET_KEY!,
            bucket: process.env.TENCENT_COS_BUCKET!,
          },
        };
        break;
      default:
        throw new Error(`Unsupported storage provider: ${providerType}`);
    }

    this.initialize(config);
  }

  /**
   * 获取当前配置的提供商类型
   */
  static getProviderType(): StorageProviderType | null {
    return this.config?.type || null;
  }

  /**
   * 从数据库加载默认存储配置并初始化
   */
  static async initializeFromDatabase(tenantId?: string): Promise<void> {
    const { prisma } = await import('@/lib/prisma');

    const provider = await prisma.storageProvider.findFirst({
      where: {
        tenantId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!provider) {
      throw new Error('No default storage provider found');
    }

    const config: StorageProviderConfig = {
      type: provider.providerCode as StorageProviderType,
      config: provider.config as StorageConfig,
    };

    this.initialize(config);
  }

  /**
   * 从数据库或环境变量加载配置并初始化
   * 优先使用数据库配置，如果没有则使用环境变量
   */
  static async initializeFromDatabaseOrEnv(tenantId?: string): Promise<void> {
    try {
      await this.initializeFromDatabase(tenantId);
    } catch (error) {
      console.warn('Failed to load storage config from database, falling back to env:', error);
      this.initializeFromEnv();
    }
  }
}
