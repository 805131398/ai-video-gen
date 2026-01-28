"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development';
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
