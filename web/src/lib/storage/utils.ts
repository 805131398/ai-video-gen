// Storage Utils - 工具函数

import { FILE_LIMITS, FileCategory, BusinessType } from './types';

/**
 * 根据 MIME 类型获取文件类别
 */
export function getFileCategory(mimeType: string): FileCategory | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return null;
}

/**
 * 验证文件类型和大小
 */
export function validateFile(
  mimeType: string,
  size: number
): { valid: boolean; error?: string } {
  const category = getFileCategory(mimeType);

  if (!category) {
    return { valid: false, error: '不支持的文件类型' };
  }

  const limits = FILE_LIMITS[category];

  if (!limits.types.includes(mimeType)) {
    return { valid: false, error: `不支持的${category}格式: ${mimeType}` };
  }

  if (size > limits.maxSize) {
    const maxSizeMB = limits.maxSize / (1024 * 1024);
    return { valid: false, error: `文件大小超过限制 (最大 ${maxSizeMB}MB)` };
  }

  return { valid: true };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 根据业务类型获取允许的文件类别
 */
export function getAllowedCategories(businessType: BusinessType): FileCategory[] {
  switch (businessType) {
    case 'project-images':
    case 'avatars':
      return ['image'];
    case 'project-videos':
      return ['video'];
    case 'project-audio':
      return ['audio'];
    case 'ai-generated':
    case 'user-uploads':
      return ['image', 'video', 'audio'];
    default:
      return ['image', 'video', 'audio'];
  }
}
