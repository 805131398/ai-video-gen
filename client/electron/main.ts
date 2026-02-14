import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import {
  initDatabase,
  getUser,
  saveUser,
  saveActivationCode,
  getActivationHistory,
  getSetting,
  saveSetting,
  // 项目管理
  saveProject,
  getProject,
  getProjects,
  deleteProject,
  // 角色管理
  saveCharacter,
  getProjectCharacters,
  deleteCharacter,
  // 数字人管理
  saveDigitalHuman,
  getDigitalHumans,
  deleteDigitalHuman,
  // 剧本管理
  saveScript,
  getProjectScripts,
  deleteScript,
  // 场景管理
  saveScene,
  getScriptScenes,
  deleteScene,
  // 场景视频管理
  saveSceneVideo,
  getSceneVideos,
  deleteSceneVideo,
  // 生成快照管理
  saveGenerationSnapshot,
  getGenerationSnapshots,
  // 场景提示词缓存管理
  saveScenePromptCache,
  getScenePromptCache,
  // 资源下载管理
  saveResourceDownload,
  getResourceDownload,
  updateResourceDownload,
  // 供应商上传记录管理
  getProviderUploadRecord,
  saveProviderUploadRecord,
  deleteProviderUploadRecord,
} from './database';
import { downloadResource, deleteProjectResources } from './resources';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

// 注册自定义协议 scheme（必须在 app.whenReady 之前调用）
protocol.registerSchemesAsPrivileged([{
  scheme: 'local-resource',
  privileges: {
    secure: true,
    supportFetchAPI: true,
    bypassCSP: true,
    corsEnabled: true,
    stream: true,
  }
}]);

function createWindow() {
  // 设置图标路径
  const iconPath = isDev
    ? path.join(__dirname, '../build/icon.png')
    : path.join(__dirname, '../build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪
app.whenReady().then(() => {
  // 初始化数据库
  initDatabase();

  // 注册自定义协议处理器，用于加载本地资源文件
  protocol.handle('local-resource', (request) => {
    // URL 格式: local-resource:///path/to/file
    const filePath = decodeURIComponent(request.url.slice('local-resource://'.length));
    return net.fetch(`file://${filePath}`);
  });

  // 创建窗口
  createWindow();

  // 注册 IPC 处理器
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 注册 IPC 处理器
function registerIpcHandlers() {
  // 数据库操作
  ipcMain.handle('db:getUser', async () => {
    return getUser();
  });

  ipcMain.handle('db:saveUser', async (_, user) => {
    return saveUser(user);
  });

  ipcMain.handle('db:saveActivationCode', async (_, code) => {
    return saveActivationCode(code);
  });

  ipcMain.handle('db:getActivationHistory', async () => {
    return getActivationHistory();
  });

  // 项目管理
  ipcMain.handle('db:saveProject', async (_, project: any) => {
    return saveProject(project);
  });

  ipcMain.handle('db:getProject', async (_, projectId: string) => {
    return getProject(projectId);
  });

  ipcMain.handle('db:getProjects', async () => {
    return getProjects();
  });

  ipcMain.handle('db:deleteProject', async (_, projectId: string) => {
    const result = deleteProject(projectId);
    if (result) {
      deleteProjectResources(projectId);
    }
    return result;
  });

  // 角色管理
  ipcMain.handle('db:saveCharacter', async (_, character: any) => {
    return saveCharacter(character);
  });

  ipcMain.handle('db:getProjectCharacters', async (_, projectId: string) => {
    return getProjectCharacters(projectId);
  });

  ipcMain.handle('db:deleteCharacter', async (_, characterId: string) => {
    return deleteCharacter(characterId);
  });

  // 数字人管理
  ipcMain.handle('db:saveDigitalHuman', async (_, digitalHuman: any) => {
    return saveDigitalHuman(digitalHuman);
  });

  ipcMain.handle('db:getDigitalHumans', async (_, characterId: string) => {
    return getDigitalHumans(characterId);
  });

  ipcMain.handle('db:deleteDigitalHuman', async (_, digitalHumanId: string) => {
    return deleteDigitalHuman(digitalHumanId);
  });

  // 剧本管理
  ipcMain.handle('db:saveScript', async (_, script: any) => {
    return saveScript(script);
  });

  ipcMain.handle('db:getProjectScripts', async (_, projectId: string) => {
    return getProjectScripts(projectId);
  });

  ipcMain.handle('db:deleteScript', async (_, scriptId: string) => {
    return deleteScript(scriptId);
  });

  // 场景管理
  ipcMain.handle('db:saveScene', async (_, scene: any) => {
    return saveScene(scene);
  });

  ipcMain.handle('db:getScriptScenes', async (_, scriptId: string) => {
    return getScriptScenes(scriptId);
  });

  ipcMain.handle('db:deleteScene', async (_, sceneId: string) => {
    return deleteScene(sceneId);
  });

  // 场景视频管理
  ipcMain.handle('db:saveSceneVideo', async (_, video: any) => {
    return saveSceneVideo(video);
  });

  ipcMain.handle('db:getSceneVideos', async (_, sceneId: string) => {
    return getSceneVideos(sceneId);
  });

  ipcMain.handle('db:deleteSceneVideo', async (_, videoId: string) => {
    return deleteSceneVideo(videoId);
  });

  // 生成快照管理
  ipcMain.handle('db:saveGenerationSnapshot', async (_, snapshot: any) => {
    return saveGenerationSnapshot(snapshot);
  });

  ipcMain.handle('db:getGenerationSnapshots', async (_, sceneId: string) => {
    return getGenerationSnapshots(sceneId);
  });

  // 场景提示词缓存管理
  ipcMain.handle('db:saveScenePromptCache', async (_, cache: any) => {
    return saveScenePromptCache(cache);
  });

  ipcMain.handle('db:getScenePromptCache', async (_, sceneId: string) => {
    return getScenePromptCache(sceneId);
  });

  // 供应商上传记录管理
  ipcMain.handle('db:getProviderUploadRecord', async (_, localResourceHash: string, providerName: string) => {
    return getProviderUploadRecord(localResourceHash, providerName);
  });

  ipcMain.handle('db:saveProviderUploadRecord', async (_, record: any) => {
    return saveProviderUploadRecord(record);
  });

  ipcMain.handle('db:deleteProviderUploadRecord', async (_, localResourceHash: string, providerName: string) => {
    return deleteProviderUploadRecord(localResourceHash, providerName);
  });

  // 资源下载管理
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
    const { getSetting } = await import('./database');

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

  // 设置操作
  ipcMain.handle('settings:get', async (_, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle('settings:save', async (_, key: string, value: string) => {
    return saveSetting(key, value);
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

      async function calculateDir(dirPath: string) {
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

      async function clearDir(dirPath: string) {
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
  ipcMain.on('app:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('app:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('app:close', () => {
    mainWindow?.close();
  });
}
