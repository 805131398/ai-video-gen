"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getUser = getUser;
exports.saveUser = saveUser;
exports.saveActivationCode = saveActivationCode;
exports.getActivationHistory = getActivationHistory;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
let db = null;
// 获取数据库路径
function getDatabasePath() {
    const userDataPath = electron_1.app.getPath('userData');
    const dbDir = path_1.default.join(userDataPath, 'database');
    // 确保目录存在
    if (!fs_1.default.existsSync(dbDir)) {
        fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    return path_1.default.join(dbDir, 'app.db');
}
// 初始化数据库
function initDatabase() {
    const dbPath = getDatabasePath();
    console.log('Database path:', dbPath);
    db = new better_sqlite3_1.default(dbPath);
    // 创建表
    createTables();
}
// 创建表结构
function createTables() {
    if (!db)
        return;
    // 用户信息表
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // 激活码记录表
    db.exec(`
    CREATE TABLE IF NOT EXISTS activation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      activated_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // 使用记录表
    db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    console.log('Database tables created successfully');
}
// 获取用户信息
function getUser() {
    if (!db)
        return null;
    const stmt = db.prepare('SELECT * FROM users LIMIT 1');
    return stmt.get();
}
// 保存用户信息
function saveUser(user) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (user_id, username, email, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
        stmt.run(user.user_id, user.username, user.email);
        return true;
    }
    catch (error) {
        console.error('Error saving user:', error);
        return false;
    }
}
// 保存激活码记录
function saveActivationCode(code) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT INTO activation_records (code, type, activated_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(code.code, code.type, code.activated_at, code.expires_at);
        return true;
    }
    catch (error) {
        console.error('Error saving activation code:', error);
        return false;
    }
}
// 获取激活历史记录
function getActivationHistory() {
    if (!db)
        return [];
    const stmt = db.prepare('SELECT * FROM activation_records ORDER BY created_at DESC');
    return stmt.all();
}
