const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * 应用数据目录管理
 * 负责创建和管理应用的本地数据目录
 */
class AppDataManager {
  constructor() {
    // 获取应用数据目录（遵循操作系统规范）
    // Windows: C:\Users\<用户名>\AppData\Roaming\ai-video-gen
    // macOS: ~/Library/Application Support/ai-video-gen
    // Linux: ~/.config/ai-video-gen
    this.appDataPath = app.getPath('userData');

    // 数据库目录
    this.dbPath = path.join(this.appDataPath, 'database');

    // 文件存储目录
    this.storagePath = path.join(this.appDataPath, 'storage');

    // 日志目录
    this.logsPath = path.join(this.appDataPath, 'logs');

    // 临时文件目录
    this.tempPath = path.join(this.appDataPath, 'temp');
  }

  /**
   * 初始化应用数据目录
   */
  initialize() {
    console.log('Initializing app data directories...');
    console.log('App data path:', this.appDataPath);

    // 创建所有必要的目录
    this.ensureDir(this.appDataPath);
    this.ensureDir(this.dbPath);
    this.ensureDir(this.storagePath);
    this.ensureDir(this.logsPath);
    this.ensureDir(this.tempPath);

    // 创建存储子目录
    this.ensureDir(path.join(this.storagePath, 'images'));
    this.ensureDir(path.join(this.storagePath, 'videos'));
    this.ensureDir(path.join(this.storagePath, 'audio'));
    this.ensureDir(path.join(this.storagePath, 'exports'));

    console.log('App data directories initialized successfully');
  }

  /**
   * 确保目录存在，不存在则创建
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('Created directory:', dirPath);
    }
  }

  /**
   * 获取数据库文件路径
   */
  getDatabasePath() {
    return path.join(this.dbPath, 'app.db');
  }

  /**
   * 获取存储目录路径
   */
  getStoragePath(subPath = '') {
    return subPath ? path.join(this.storagePath, subPath) : this.storagePath;
  }

  /**
   * 获取日志目录路径
   */
  getLogsPath() {
    return this.logsPath;
  }

  /**
   * 获取临时目录路径
   */
  getTempPath() {
    return this.tempPath;
  }

  /**
   * 清理临时文件
   */
  cleanTempFiles() {
    try {
      const files = fs.readdirSync(this.tempPath);
      files.forEach(file => {
        const filePath = path.join(this.tempPath, file);
        fs.unlinkSync(filePath);
      });
      console.log('Temp files cleaned');
    } catch (error) {
      console.error('Failed to clean temp files:', error);
    }
  }

  /**
   * 获取应用数据统计
   */
  getStats() {
    const getDirectorySize = (dirPath) => {
      let size = 0;
      try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            size += getDirectorySize(filePath);
          } else {
            size += stats.size;
          }
        });
      } catch (error) {
        console.error('Failed to get directory size:', error);
      }
      return size;
    };

    return {
      appDataPath: this.appDataPath,
      databaseSize: getDirectorySize(this.dbPath),
      storageSize: getDirectorySize(this.storagePath),
      logsSize: getDirectorySize(this.logsPath),
      tempSize: getDirectorySize(this.tempPath),
    };
  }
}

module.exports = AppDataManager;
