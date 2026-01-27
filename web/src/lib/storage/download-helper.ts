/**
 * 下载远程图片并保存到本地存储
 * 用于将 AI 生成的图片从远程 URL 下载到本地
 */

import { StorageFactory } from '@/lib/storage';

export async function downloadAndSaveImage(
  imageUrl: string,
  tenantId: string,
  businessType: 'project-images' | 'ai-generated' | 'user-uploads' = 'ai-generated',
  filename?: string
): Promise<{ url: string; key: string }> {
  try {
    // 如果已经是本地 URL，直接返回
    if (imageUrl.startsWith('/api/storage/')) {
      return {
        url: imageUrl,
        key: imageUrl.replace('/api/storage/', ''),
      };
    }

    // 下载远程图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/png';

    // 生成文件名
    if (!filename) {
      const ext = contentType.split('/')[1] || 'png';
      filename = `image_${Date.now()}.${ext}`;
    }

    // 生成存储 key
    const key = StorageFactory.generateKey(tenantId, businessType, filename);

    // 上传到本地存储
    const adapter = StorageFactory.getAdapter();
    const result = await adapter.upload(buffer, key, contentType);

    return {
      url: result.url,
      key: result.key,
    };
  } catch (error) {
    console.error('Failed to download and save image:', error);
    throw error;
  }
}

/**
 * 批量下载并保存图片
 */
export async function downloadAndSaveImages(
  imageUrls: string[],
  tenantId: string,
  businessType: 'project-images' | 'ai-generated' | 'user-uploads' = 'ai-generated'
): Promise<Array<{ url: string; key: string; originalUrl: string }>> {
  const results = await Promise.allSettled(
    imageUrls.map(async (url) => {
      const result = await downloadAndSaveImage(url, tenantId, businessType);
      return {
        ...result,
        originalUrl: url,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ url: string; key: string; originalUrl: string }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value);
}
