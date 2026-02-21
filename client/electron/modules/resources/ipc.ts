import { app, ipcMain, shell } from 'electron';
import path from 'path';
import fsSync from 'fs';
import fs from 'fs/promises';
import crypto from 'crypto';
import { downloadResource, getResourceDownload, updateResourceDownload } from './service';

export function registerResourceHandlers() {
    ipcMain.handle('resources:download', async (_, params: any) => {
        return await downloadResource(params);
    });

    ipcMain.handle('resources:getStatus', async (_, resourceType: string, resourceId: string) => {
        const download = getResourceDownload(resourceType, resourceId);
        if (!download) return null;

        return {
            status: download.status,
            progress:
                download.fileSize && download.downloadedSize
                    ? Math.round((download.downloadedSize / download.fileSize) * 100)
                    : 0,
            localPath: download.localPath,
            error: download.errorMessage,
        };
    });

    ipcMain.handle('resources:retry', async (_, resourceType: string, resourceId: string) => {
        const download = getResourceDownload(resourceType, resourceId);
        if (!download) return { success: false, error: 'Download record not found' };

        updateResourceDownload(resourceType, resourceId, {
            status: 'pending',
            errorMessage: null,
        });

        return { success: true };
    });

    // 获取资源根目录路径
    ipcMain.handle('resources:getRootPath', async () => {
        const userDataPath = app.getPath('userData');
        const resourcesRoot = path.join(userDataPath, 'resources');
        return {
            userDataPath,
            resourcesRoot,
        };
    });

    // 打开资源文件夹
    ipcMain.handle('resources:openFolder', async () => {
        const { getSetting } = await import('../database/service');

        // 尝试从设置中读取路径配置
        const pathType = getSetting('storage_path_type');
        const customPath = getSetting('storage_custom_path');

        // 确定实际路径
        let resourcesRoot: string;
        if (pathType === 'custom' && customPath) {
            resourcesRoot = customPath;
        } else {
            resourcesRoot = path.join(app.getPath('userData'), 'resources');
        }

        // 确保目录存在
        if (!fsSync.existsSync(resourcesRoot)) {
            await fs.mkdir(resourcesRoot, { recursive: true });
        }

        // 打开文件夹
        await shell.openPath(resourcesRoot);

        return { success: true, path: resourcesRoot };
    });

    // 文件读取 + 哈希计算（供应商上传用）
    ipcMain.handle('resources:readFileInfo', async (_, filePath: string) => {
        try {
            const buffer = fsSync.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');
            const ext = path.extname(filePath).toLowerCase();
            const mimeMap: Record<string, string> = {
                '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
            };
            return {
                success: true,
                base64: buffer.toString('base64'),
                hash,
                size: buffer.length,
                mimeType: mimeMap[ext] || 'application/octet-stream',
                fileName: path.basename(filePath),
            };
        } catch (error: any) {
            console.error('Error reading file info:', error);
            return { success: false, error: error.message };
        }
    });
}
