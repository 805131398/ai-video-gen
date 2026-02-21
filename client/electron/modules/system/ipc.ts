import { app, ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { getSetting, saveSetting } from '../database/service';

export function registerSystemHandlers() {
    // 设置操作
    ipcMain.handle('settings:get', async (_, key: string) => {
        return getSetting(key);
    });

    ipcMain.handle('settings:save', async (_, key: string, value: string) => {
        return saveSetting(key, value);
    });

    // 存储管理 - 选择文件（图片）
    ipcMain.handle('dialog:selectFile', async (_, options?: { filters?: { name: string; extensions: string[] }[]; title?: string }) => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            title: options?.title || '选择文件',
            filters: options?.filters || [
                { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
                { name: '所有文件', extensions: ['*'] },
            ],
        });
        return result.canceled ? undefined : result.filePaths[0];
    });

    // 存储管理 - 选择文件夹
    ipcMain.handle('dialog:selectFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: '选择保存位置'
        });
        return result.canceled ? undefined : result.filePaths[0];
    });

    // 存储管理 - 获取默认路径
    ipcMain.handle('storage:getDefaultPath', () => {
        return path.join(app.getPath('userData'), 'media');
    });

    // 存储管理 - 计算文件夹大小
    ipcMain.handle('storage:calculateSize', async (_, folderPath: string) => {
        try {
            let totalBytes = 0;
            let fileCount = 0;

            const calculateDir = async (dirPath: string) => {
                try {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });

                    for (const entry of entries) {
                        const fullPath = path.join(dirPath, entry.name);

                        try {
                            if (entry.isDirectory()) {
                                await calculateDir(fullPath);
                            } else {
                                const stats = await fs.stat(fullPath);
                                totalBytes += stats.size;
                                fileCount++;
                            }
                        } catch (err) {
                            // 跳过无法访问的文件
                            console.warn(`Skip file: ${fullPath}`, err);
                        }
                    }
                } catch (err) {
                    // 目录不存在或无权限
                    console.warn(`Cannot read directory: ${dirPath}`, err);
                }
            }

            await calculateDir(folderPath);
            return { bytes: totalBytes, count: fileCount };
        } catch (error) {
            console.error('Calculate size error:', error);
            return { bytes: 0, count: 0 };
        }
    });

    // 存储管理 - 清理缓存
    ipcMain.handle('storage:clearCache', async (_, folderPath: string) => {
        try {
            let deletedCount = 0;

            const clearDir = async (dirPath: string) => {
                try {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });

                    for (const entry of entries) {
                        const fullPath = path.join(dirPath, entry.name);

                        try {
                            if (entry.isDirectory()) {
                                await clearDir(fullPath);
                                await fs.rmdir(fullPath);
                            } else {
                                await fs.unlink(fullPath);
                                deletedCount++;
                            }
                        } catch (err) {
                            // 跳过正在使用的文件
                            console.warn(`Skip file: ${fullPath}`, err);
                        }
                    }
                } catch (err) {
                    console.warn(`Cannot clear directory: ${dirPath}`, err);
                }
            }

            await clearDir(folderPath);
            return { success: true, deletedCount };
        } catch (error) {
            console.error('Clear cache error:', error);
            return { success: false, deletedCount: 0 };
        }
    });

    // 应用控制
    ipcMain.on('app:minimize', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on('app:maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win?.isMaximized()) {
            win.unmaximize();
        } else {
            win?.maximize();
        }
    });

    ipcMain.on('app:close', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
    });
}
