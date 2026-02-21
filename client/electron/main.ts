import { app, BrowserWindow, protocol, net, nativeImage } from 'electron';
import path from 'path';
import fsSync from 'fs';
import { initDatabase } from './modules/database/service';
import { registerAllIpcHandlers } from './modules';

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
    frame: false,
    titleBarStyle: 'hidden', // Disable default frame but keep traffic lights on macOS
    titleBarOverlay: false,
    trafficLightPosition: { x: 12, y: 14 }, // Center vertically in 40px title bar
  });

  // 启动时最大化窗口
  mainWindow.maximize();

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

  // macOS: 设置 Dock 图标（开发模式下 Electron 默认使用自带图标）
  if (process.platform === 'darwin') {
    const dockIconPath = path.join(__dirname, '../build/icon.png');
    if (fsSync.existsSync(dockIconPath)) {
      const dockIcon = nativeImage.createFromPath(dockIconPath);
      app.dock.setIcon(dockIcon);
    }
  }

  // 注册自定义协议处理器，用于加载本地资源文件
  protocol.handle('local-resource', (request) => {
    // URL 格式: local-resource:///path/to/file
    const filePath = decodeURIComponent(request.url.slice('local-resource://'.length));
    return net.fetch(`file://${filePath}`);
  });

  // 创建窗口
  createWindow();

  // 注册所有业务模块封装的 IPC 处理器
  registerAllIpcHandlers();

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
