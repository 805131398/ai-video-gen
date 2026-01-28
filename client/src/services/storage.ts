import api from './api';

export type BusinessType =
  | 'project-images'
  | 'project-videos'
  | 'project-audio'
  | 'ai-generated'
  | 'user-uploads'
  | 'avatars';

interface UploadUrlResponse {
  data: {
    uploadUrl: string;
    key: string;
    url: string;
    originalName: string;
    businessType: BusinessType;
    businessId?: string;
  };
}

/**
 * 获取文件上传预签名 URL
 */
export async function getUploadUrl(
  filename: string,
  mimeType: string,
  size: number,
  businessType: BusinessType,
  businessId?: string
): Promise<UploadUrlResponse['data']> {
  const response = await api.post<UploadUrlResponse>('/storage/upload-url', {
    filename,
    mimeType,
    size,
    businessType,
    businessId,
  });
  return response.data.data;
}

/**
 * 上传文件到云存储
 */
export async function uploadFile(
  file: File,
  businessType: BusinessType,
  businessId?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 1. 获取预签名 URL
  const uploadData = await getUploadUrl(
    file.name,
    file.type,
    file.size,
    businessType,
    businessId
  );

  // 2. 直接上传到云存储
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
    }

    // 监听上传完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(uploadData.url);
      } else {
        reject(new Error(`上传失败: ${xhr.statusText}`));
      }
    });

    // 监听上传错误
    xhr.addEventListener('error', () => {
      reject(new Error('上传失败'));
    });

    // 发送请求
    xhr.open('PUT', uploadData.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * 上传图片（头像专用）
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    throw new Error('只能上传图片文件');
  }

  // 验证文件大小（最大 5MB）
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('图片大小不能超过 5MB');
  }

  return uploadFile(file, 'avatars', undefined, onProgress);
}
