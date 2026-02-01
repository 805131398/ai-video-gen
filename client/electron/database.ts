import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

// 获取数据库路径
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');

  // 确保目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'app.db');
}

// 初始化数据库
export function initDatabase() {
  const dbPath = getDatabasePath();
  console.log('Database path:', dbPath);

  db = new Database(dbPath);

  // 创建表
  createTables();
}

// 创建表结构
function createTables() {
  if (!db) return;

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

  // 应用设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables created successfully');
}

// 获取用户信息
export function getUser() {
  if (!db) return null;

  const stmt = db.prepare('SELECT * FROM users LIMIT 1');
  return stmt.get();
}

// 保存用户信息
export function saveUser(user: any) {
  if (!db) return false;

  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO users (user_id, username, email, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(user.user_id, user.username, user.email);
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

// 保存激活码记录
export function saveActivationCode(code: any) {
  if (!db) return false;

  try {
    const stmt = db.prepare(`
      INSERT INTO activation_records (code, type, activated_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(code.code, code.type, code.activated_at, code.expires_at);
    return true;
  } catch (error) {
    console.error('Error saving activation code:', error);
    return false;
  }
}

// 获取激活历史记录
export function getActivationHistory() {
  if (!db) return [];

  const stmt = db.prepare('SELECT * FROM activation_records ORDER BY created_at DESC');
  return stmt.all();
}

// 获取设置
export function getSetting(key: string) {
  if (!db) return null;
  const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  return row?.value || null;
}

// 保存设置
export function saveSetting(key: string, value: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
    return true;
  } catch (error) {
    console.error('Error saving setting:', error);
    return false;
  }
}
