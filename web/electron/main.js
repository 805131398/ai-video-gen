const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const AppDataManager = require('./app-data');
const DatabaseInitializer = require('./database-init');

let mainWindow;
let nextServer;
let appDataManager;
const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    show: false, // 先隐藏，等加载完成后显示
  });

  // 加载 Next.js 应用
  const url = isDev
    ? `http://localhost:${port}`
    : `http://localhost:${port}`;

  mainWindow.loadURL(url);

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 开发模式下打开 DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 检查服务器是否已经运行
async function checkServerRunning() {
  try {
    const http = require('http');
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        resolve(false);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    return false;
  }
}

// 启动 Next.js 服务器
function startNextServer() {
  return new Promise((resolve, reject) => {
    const nextPath = path.join(__dirname, '../node_modules/.bin/next');
    const nextCommand = isDev ? 'dev' : 'start';

    nextServer = spawn(
      process.platform === 'win32' ? 'cmd' : nextPath,
      process.platform === 'win32'
        ? ['/c', 'next', nextCommand, '--turbopack', '-p', port.toString()]
        : [nextCommand, '--turbopack', '-p', port.toString()],
      {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: port.toString() },
        shell: process.platform === 'win32',
      }
    );

    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes('Ready') || data.toString().includes('started')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // 超时处理
    setTimeout(() => {
      resolve(); // 即使没有检测到 Ready，也继续
    }, 15000);
  });
}

// 应用启动
app.whenReady().then(async () => {
  try {
    // 初始化应用数据目录
    appDataManager = new AppDataManager();
    appDataManager.initialize();

    // 初始化数据库
    const dbInitializer = new DatabaseInitializer(appDataManager);
    await dbInitializer.initialize();

    // 设置环境变量供 Next.js 使用
    process.env.DATABASE_URL = `file:${appDataManager.getDatabasePath()}`;
    process.env.STORAGE_PATH = appDataManager.getStoragePath();

    // 检查服务器是否已经运行
    const serverRunning = await checkServerRunning();

    if (!serverRunning) {
      console.log('Starting Next.js server...');
      // 启动 Next.js 服务器
      await startNextServer();
      // 等待服务器完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('Next.js server is already running, connecting to it...');
    }

    // 创建窗口
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
  // 清理临时文件
  if (appDataManager) {
    appDataManager.cleanTempFiles();
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

