import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, getUser, saveUser, saveActivationCode, getActivationHistory, getSetting, saveSetting } from './database';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

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

  // 设置操作
  ipcMain.handle('settings:get', async (_, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle('settings:save', async (_, key: string, value: string) => {
    return saveSetting(key, value);
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
