// useFileUpload Hook - 文件上传 Hook

import { useState, useCallback } from 'react';
import { BusinessType, FileRecord } from '@/lib/storage/types';

interface UseFileUploadOptions {
  businessType: BusinessType;
  businessId?: string;
  onSuccess?: (file: FileRecord) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: Error | null;
}

export function useFileUpload(options: UseFileUploadOptions) {
  const { businessType, businessId, onSuccess, onError, onProgress } = options;
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(async (file: File): Promise<FileRecord | null> => {
    setState({ isUploading: true, progress: 0, error: null });

    try {
      // 1. 获取预签名 URL
      const urlRes = await fetch('/api/storage/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          businessType,
          businessId,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        throw new Error(err.error || '获取上传 URL 失败');
      }

      const { data: urlData } = await urlRes.json();
      setState(s => ({ ...s, progress: 10 }));
      onProgress?.(10);

      // 2. 直接上传到 OSS
      const uploadRes = await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round(10 + (e.loaded / e.total) * 80);
            setState(s => ({ ...s, progress: percent }));
            onProgress?.(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`上传失败: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.open('PUT', urlData.url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setState(s => ({ ...s, progress: 90 }));
      onProgress?.(90);

      // 3. 回调通知后端
      const callbackRes = await fetch('/api/storage/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: urlData.key,
          size: file.size,
          mimeType: file.type,
          originalName: file.name,
          businessType,
          businessId,
        }),
      });

      if (!callbackRes.ok) {
        const err = await callbackRes.json();
        throw new Error(err.error || '上传回调失败');
      }

      const { data: fileRecord } = await callbackRes.json();
      setState({ isUploading: false, progress: 100, error: null });
      onProgress?.(100);
      onSuccess?.(fileRecord);
      return fileRecord;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('上传失败');
      setState({ isUploading: false, progress: 0, error: err });
      onError?.(err);
      return null;
    }
  }, [businessType, businessId, onSuccess, onError, onProgress]);

  const uploadMultiple = useCallback(async (files: File[]): Promise<FileRecord[]> => {
    const results: FileRecord[] = [];
    for (const file of files) {
      const result = await upload(file);
      if (result) {
        results.push(result);
      }
    }
    return results;
  }, [upload]);

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    upload,
    uploadMultiple,
    reset,
    isUploading: state.isUploading,
    progress: state.progress,
    error: state.error,
  };
}
