// Alibaba Cloud OSS Storage Adapter

import OSS from 'ali-oss';
import { IStorageAdapter } from './base';
import { AliOSSConfig, UploadResult, SignedUrlResult } from '../types';

export class AliOSSAdapter implements IStorageAdapter {
  private client: OSS;
  private bucket: string;
  private region: string;

  constructor(config: AliOSSConfig) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      endpoint: config.endpoint,
    });
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    const result = await this.client.put(key, buffer, {
      headers: { 'Content-Type': mimeType },
    });

    return {
      key,
      url: this.getPublicUrl(key),
      size: buffer.length,
      mimeType,
    };
  }

  async getUploadSignedUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    const url = this.client.signatureUrl(key, {
      method: 'PUT',
      expires: expiresIn,
      'Content-Type': mimeType,
    });

    return {
      url,
      key,
      expires: Date.now() + expiresIn * 1000,
    };
  }

  async getDownloadSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.client.signatureUrl(key, {
      method: 'GET',
      expires: expiresIn,
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.head(key);
      return true;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.${this.region}.aliyuncs.com/${key}`;
  }
}
