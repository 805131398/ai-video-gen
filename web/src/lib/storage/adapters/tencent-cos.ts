// Tencent Cloud COS Storage Adapter

import COS from 'cos-nodejs-sdk-v5';
import { IStorageAdapter } from './base';
import { COSConfig, UploadResult, SignedUrlResult } from '../types';

export class COSAdapter implements IStorageAdapter {
  private client: COS;
  private bucket: string;
  private region: string;

  constructor(config: COSConfig) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.client = new COS({
      SecretId: config.secretId,
      SecretKey: config.secretKey,
    });
  }

  async upload(buffer: Buffer, key: string, mimeType: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      this.client.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              key,
              url: this.getPublicUrl(key),
              size: buffer.length,
              mimeType,
            });
          }
        }
      );
    });
  }

  async getUploadSignedUrl(
    key: string,
    mimeType: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    return new Promise((resolve, reject) => {
      this.client.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Method: 'PUT',
          Expires: expiresIn,
          Headers: { 'Content-Type': mimeType },
          Sign: true,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              url: data.Url,
              key,
              expires: Date.now() + expiresIn * 1000,
            });
          }
        }
      );
    });
  }

  async getDownloadSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.getObjectUrl(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
          Method: 'GET',
          Expires: expiresIn,
          Sign: true,
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.Url);
          }
        }
      );
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.deleteObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async exists(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: key,
        },
        (err) => {
          if (err) {
            if (err.statusCode === 404) {
              resolve(false);
            } else {
              reject(err);
            }
          } else {
            resolve(true);
          }
        }
      );
    });
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }
}
