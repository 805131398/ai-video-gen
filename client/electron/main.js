"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("./database");
const resources_1 = require("./resources");
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development';
// 注册自定义协议 scheme（必须在 app.whenReady 之前调用）
electron_1.protocol.registerSchemesAsPrivileged([{
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
        ? path_1.default.join(__dirname, '../build/icon.png')
        : path_1.default.join(__dirname, '../build/icon.png');
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        icon: iconPath,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
    });
    if (isDev) {
        // 开发模式：加载 Vite 开发服务器
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        // 生产模式：加载打包后的文件
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// 应用准备就绪
electron_1.app.whenReady().then(() => {
    // 初始化数据库
    (0, database_1.initDatabase)();
    // 注册自定义协议处理器，用于加载本地资源文件
    electron_1.protocol.handle('local-resource', (request) => {
        // URL 格式: local-resource:///path/to/file
        const filePath = decodeURIComponent(request.url.slice('local-resource://'.length));
        return electron_1.net.fetch(`file://${filePath}`);
    });
    // 创建窗口
    createWindow();
    // 注册 IPC 处理器
    registerIpcHandlers();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
// 所有窗口关闭时退出应用（macOS 除外）
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// 注册 IPC 处理器
function registerIpcHandlers() {
    // 数据库操作
    electron_1.ipcMain.handle('db:getUser', async () => {
        return (0, database_1.getUser)();
    });
    electron_1.ipcMain.handle('db:saveUser', async (_, user) => {
        return (0, database_1.saveUser)(user);
    });
    electron_1.ipcMain.handle('db:saveActivationCode', async (_, code) => {
        return (0, database_1.saveActivationCode)(code);
    });
    electron_1.ipcMain.handle('db:getActivationHistory', async () => {
        return (0, database_1.getActivationHistory)();
    });
    // 项目管理
    electron_1.ipcMain.handle('db:saveProject', async (_, project) => {
        return (0, database_1.saveProject)(project);
    });
    electron_1.ipcMain.handle('db:getProject', async (_, projectId) => {
        return (0, database_1.getProject)(projectId);
    });
    electron_1.ipcMain.handle('db:getProjects', async () => {
        return (0, database_1.getProjects)();
    });
    electron_1.ipcMain.handle('db:deleteProject', async (_, projectId) => {
        const result = (0, database_1.deleteProject)(projectId);
        if (result) {
            (0, resources_1.deleteProjectResources)(projectId);
        }
        return result;
    });
    // 角色管理
    electron_1.ipcMain.handle('db:saveCharacter', async (_, character) => {
        return (0, database_1.saveCharacter)(character);
    });
    electron_1.ipcMain.handle('db:getProjectCharacters', async (_, projectId) => {
        return (0, database_1.getProjectCharacters)(projectId);
    });
    electron_1.ipcMain.handle('db:deleteCharacter', async (_, characterId) => {
        return (0, database_1.deleteCharacter)(characterId);
    });
    // 数字人管理
    electron_1.ipcMain.handle('db:saveDigitalHuman', async (_, digitalHuman) => {
        return (0, database_1.saveDigitalHuman)(digitalHuman);
    });
    electron_1.ipcMain.handle('db:getDigitalHumans', async (_, characterId) => {
        return (0, database_1.getDigitalHumans)(characterId);
    });
    electron_1.ipcMain.handle('db:deleteDigitalHuman', async (_, digitalHumanId) => {
        return (0, database_1.deleteDigitalHuman)(digitalHumanId);
    });
    // 剧本管理
    electron_1.ipcMain.handle('db:saveScript', async (_, script) => {
        return (0, database_1.saveScript)(script);
    });
    electron_1.ipcMain.handle('db:getProjectScripts', async (_, projectId) => {
        return (0, database_1.getProjectScripts)(projectId);
    });
    electron_1.ipcMain.handle('db:deleteScript', async (_, scriptId) => {
        return (0, database_1.deleteScript)(scriptId);
    });
    // 场景管理
    electron_1.ipcMain.handle('db:saveScene', async (_, scene) => {
        return (0, database_1.saveScene)(scene);
    });
    electron_1.ipcMain.handle('db:getScriptScenes', async (_, scriptId) => {
        return (0, database_1.getScriptScenes)(scriptId);
    });
    electron_1.ipcMain.handle('db:deleteScene', async (_, sceneId) => {
        return (0, database_1.deleteScene)(sceneId);
    });
    // 场景视频管理
    electron_1.ipcMain.handle('db:saveSceneVideo', async (_, video) => {
        return (0, database_1.saveSceneVideo)(video);
    });
    electron_1.ipcMain.handle('db:getSceneVideos', async (_, sceneId) => {
        return (0, database_1.getSceneVideos)(sceneId);
    });
    electron_1.ipcMain.handle('db:deleteSceneVideo', async (_, videoId) => {
        return (0, database_1.deleteSceneVideo)(videoId);
    });
    // 生成快照管理
    electron_1.ipcMain.handle('db:saveGenerationSnapshot', async (_, snapshot) => {
        return (0, database_1.saveGenerationSnapshot)(snapshot);
    });
    electron_1.ipcMain.handle('db:getGenerationSnapshots', async (_, sceneId) => {
        return (0, database_1.getGenerationSnapshots)(sceneId);
    });
    // 场景提示词缓存管理
    electron_1.ipcMain.handle('db:saveScenePromptCache', async (_, cache) => {
        return (0, database_1.saveScenePromptCache)(cache);
    });
    electron_1.ipcMain.handle('db:getScenePromptCache', async (_, sceneId) => {
        return (0, database_1.getScenePromptCache)(sceneId);
    });
    // 供应商上传记录管理
    electron_1.ipcMain.handle('db:getProviderUploadRecord', async (_, localResourceHash, providerName) => {
        return (0, database_1.getProviderUploadRecord)(localResourceHash, providerName);
    });
    electron_1.ipcMain.handle('db:saveProviderUploadRecord', async (_, record) => {
        return (0, database_1.saveProviderUploadRecord)(record);
    });
    electron_1.ipcMain.handle('db:deleteProviderUploadRecord', async (_, localResourceHash, providerName) => {
        return (0, database_1.deleteProviderUploadRecord)(localResourceHash, providerName);
    });
    // 资源下载管理
    electron_1.ipcMain.handle('resources:download', async (_, params) => {
        return await (0, resources_1.downloadResource)(params);
    });
    electron_1.ipcMain.handle('resources:getStatus', async (_, resourceType, resourceId) => {
        const download = (0, database_1.getResourceDownload)(resourceType, resourceId);
        if (!download)
            return null;
        return {
            status: download.status,
            progress: download.fileSize && download.downloadedSize
                ? Math.round((download.downloadedSize / download.fileSize) * 100)
                : 0,
            localPath: download.localPath,
            error: download.errorMessage,
        };
    });
    electron_1.ipcMain.handle('resources:retry', async (_, resourceType, resourceId) => {
        const download = (0, database_1.getResourceDownload)(resourceType, resourceId);
        if (!download)
            return { success: false, error: 'Download record not found' };
        (0, database_1.updateResourceDownload)(resourceType, resourceId, {
            status: 'pending',
            errorMessage: null,
        });
        return { success: true };
    });
    // 获取资源根目录路径
    electron_1.ipcMain.handle('resources:getRootPath', async () => {
        const userDataPath = electron_1.app.getPath('userData');
        const resourcesRoot = path_1.default.join(userDataPath, 'resources');
        return {
            userDataPath,
            resourcesRoot,
        };
    });
    // 打开资源文件夹
    electron_1.ipcMain.handle('resources:openFolder', async () => {
        const { getSetting } = await Promise.resolve().then(() => __importStar(require('./database')));
        // 尝试从设置中读取路径配置
        const pathType = getSetting('storage_path_type');
        const customPath = getSetting('storage_custom_path');
        // 确定实际路径
        let resourcesRoot;
        if (pathType === 'custom' && customPath) {
            resourcesRoot = customPath;
        }
        else {
            resourcesRoot = path_1.default.join(electron_1.app.getPath('userData'), 'resources');
        }
        // 确保目录存在
        if (!fs_1.default.existsSync(resourcesRoot)) {
            await promises_1.default.mkdir(resourcesRoot, { recursive: true });
        }
        // 打开文件夹
        await electron_1.shell.openPath(resourcesRoot);
        return { success: true, path: resourcesRoot };
    });
    // 设置操作
    electron_1.ipcMain.handle('settings:get', async (_, key) => {
        return (0, database_1.getSetting)(key);
    });
    electron_1.ipcMain.handle('settings:save', async (_, key, value) => {
        return (0, database_1.saveSetting)(key, value);
    });
    // 存储管理 - 选择文件夹
    electron_1.ipcMain.handle('dialog:selectFolder', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: '选择保存位置'
        });
        return result.canceled ? undefined : result.filePaths[0];
    });
    // 存储管理 - 获取默认路径
    electron_1.ipcMain.handle('storage:getDefaultPath', () => {
        return path_1.default.join(electron_1.app.getPath('userData'), 'media');
    });
    // 存储管理 - 计算文件夹大小
    electron_1.ipcMain.handle('storage:calculateSize', async (_, folderPath) => {
        try {
            let totalBytes = 0;
            let fileCount = 0;
            async function calculateDir(dirPath) {
                try {
                    const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path_1.default.join(dirPath, entry.name);
                        try {
                            if (entry.isDirectory()) {
                                await calculateDir(fullPath);
                            }
                            else {
                                const stats = await promises_1.default.stat(fullPath);
                                totalBytes += stats.size;
                                fileCount++;
                            }
                        }
                        catch (err) {
                            // 跳过无法访问的文件
                            console.warn(`Skip file: ${fullPath}`, err);
                        }
                    }
                }
                catch (err) {
                    // 目录不存在或无权限
                    console.warn(`Cannot read directory: ${dirPath}`, err);
                }
            }
            await calculateDir(folderPath);
            return { bytes: totalBytes, count: fileCount };
        }
        catch (error) {
            console.error('Calculate size error:', error);
            return { bytes: 0, count: 0 };
        }
    });
    // 存储管理 - 清理缓存
    electron_1.ipcMain.handle('storage:clearCache', async (_, folderPath) => {
        try {
            let deletedCount = 0;
            async function clearDir(dirPath) {
                try {
                    const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path_1.default.join(dirPath, entry.name);
                        try {
                            if (entry.isDirectory()) {
                                await clearDir(fullPath);
                                await promises_1.default.rmdir(fullPath);
                            }
                            else {
                                await promises_1.default.unlink(fullPath);
                                deletedCount++;
                            }
                        }
                        catch (err) {
                            // 跳过正在使用的文件
                            console.warn(`Skip file: ${fullPath}`, err);
                        }
                    }
                }
                catch (err) {
                    console.warn(`Cannot clear directory: ${dirPath}`, err);
                }
            }
            await clearDir(folderPath);
            return { success: true, deletedCount };
        }
        catch (error) {
            console.error('Clear cache error:', error);
            return { success: false, deletedCount: 0 };
        }
    });
    // 文件读取 + 哈希计算（供应商上传用）
    electron_1.ipcMain.handle('resources:readFileInfo', async (_, filePath) => {
        try {
            const buffer = fs_1.default.readFileSync(filePath);
            const hash = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
            const ext = path_1.default.extname(filePath).toLowerCase();
            const mimeMap = {
                '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
            };
            return {
                success: true,
                base64: buffer.toString('base64'),
                hash,
                size: buffer.length,
                mimeType: mimeMap[ext] || 'application/octet-stream',
                fileName: path_1.default.basename(filePath),
            };
        }
        catch (error) {
            console.error('Error reading file info:', error);
            return { success: false, error: error.message };
        }
    });
    // 应用控制
    electron_1.ipcMain.on('app:minimize', () => {
        mainWindow?.minimize();
    });
    electron_1.ipcMain.on('app:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.on('app:close', () => {
        mainWindow?.close();
    });
}
