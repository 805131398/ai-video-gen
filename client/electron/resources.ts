import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { saveResourceDownload, updateResourceDownload } from './database';

// 获取资源根目录
function getResourcesRoot(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'resources');
}

// 确保资源目录存在
export function ensureResourceDirectory(
  projectId: string,
  resourceType: string,
  characterId?: string,
  sceneId?: string
): string {
  const root = getResourcesRoot();
  let dir = path.join(root, 'projects', projectId);

  if (resourceType === 'character_avatar' || resourceType === 'digital_human') {
    dir = path.join(dir, 'characters', characterId!);
    if (resourceType === 'digital_human') {
      dir = path.join(dir, 'digital-humans');
    }
  } else if (resourceType === 'scene_video' || resourceType === 'video_thumbnail') {
    dir = path.join(dir, 'scenes', sceneId!);
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

// 获取资源本地路径
export function getResourcePath(
  projectId: string,
  resourceType: string,
  resourceId: string,
  characterId?: string,
  sceneId?: string,
  ext?: string
): string {
  const dir = ensureResourceDirectory(projectId, resourceType, characterId, sceneId);

  let filename: string;
  if (resourceType === 'character_avatar') {
    filename = `avatar${ext}`;
  } else if (resourceType === 'digital_human') {
    filename = `${resourceId}${ext}`;
  } else if (resourceType === 'scene_video') {
    filename = `video${ext}`;
  } else if (resourceType === 'video_thumbnail') {
    filename = `thumbnail${ext}`;
  } else {
    filename = `${resourceId}${ext}`;
  }

  return path.join(dir, filename);
}

// 从 URL 获取文件扩展名
function getExtensionFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const ext = path.extname(pathname);
    return ext || '.jpg'; // 默认使用 .jpg
  } catch (error) {
    return '.jpg';
  }
}

// 下载资源文件
export async function downloadResource(params: any): Promise<any> {
  const { url, resourceType, resourceId, projectId, characterId, sceneId } = params;

  try {
    // 获取文件扩展名
    const ext = getExtensionFromUrl(url);

    // 确定本地路径
    const localPath = getResourcePath(projectId, resourceType, resourceId, characterId, sceneId, ext);

    // 保存下载记录（pending 状态）
    saveResourceDownload({
      resourceType,
      resourceId,
      remoteUrl: url,
      localPath: null,
      status: 'pending',
      errorMessage: null,
      fileSize: null,
      downloadedSize: 0,
    });

    // 开始下载
    await downloadFile(url, localPath, (downloaded, total) => {
      // 更新下载进度
      updateResourceDownload(resourceType, resourceId, {
        status: 'downloading',
        downloadedSize: downloaded,
      });
    });

    // 下载完成，更新状态
    const stats = fs.statSync(localPath);
    updateResourceDownload(resourceType, resourceId, {
      localPath,
      status: 'completed',
      downloadedSize: stats.size,
    });

    return {
      success: true,
      localPath,
    };
  } catch (error: any) {
    console.error('Error downloading resource:', error);

    // 更新失败状态
    updateResourceDownload(resourceType, resourceId, {
      status: 'failed',
      errorMessage: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

// 下载文件的核心函数
function downloadFile(
  url: string,
  dest: string,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(dest);
    let downloadedSize = 0;

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          if (fs.existsSync(dest)) {
            fs.unlinkSync(dest);
          }
          downloadFile(redirectUrl, dest, onProgress)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (onProgress) {
          onProgress(downloadedSize, totalSize);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });

    file.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(err);
    });
  });
}

// 删除项目的所有资源文件
export function deleteProjectResources(projectId: string): boolean {
  try {
    const root = getResourcesRoot();
    const projectDir = path.join(root, 'projects', projectId);

    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    return true;
  } catch (error) {
    console.error('Error deleting project resources:', error);
    return false;
  }
}
