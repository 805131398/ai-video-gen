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

  // 项目表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      title TEXT,
      status TEXT NOT NULL,
      current_step TEXT NOT NULL,
      theme_name TEXT,
      theme_desc TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )
  `);

  // 项目角色表
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_characters (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      avatar_url TEXT,
      attributes TEXT,
      sort_order INTEGER NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 数字人形象表
  db.exec(`
    CREATE TABLE IF NOT EXISTS digital_humans(
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      is_selected INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      FOREIGN KEY(character_id) REFERENCES project_characters(id) ON DELETE CASCADE
    )
    `);

  // 项目剧本表
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_scripts(
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      version INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(character_id) REFERENCES project_characters(id)
    )
    `);

  // 剧本场景表
  db.exec(`
    CREATE TABLE IF NOT EXISTS script_scenes(
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      duration INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY(script_id) REFERENCES project_scripts(id) ON DELETE CASCADE
    )
    `);

  // 场景视频表
  db.exec(`
    CREATE TABLE IF NOT EXISTS scene_videos(
      id TEXT PRIMARY KEY,
      scene_id TEXT NOT NULL,
      video_url TEXT NOT NULL,
      thumbnail_url TEXT,
      duration INTEGER,
      prompt TEXT NOT NULL,
      prompt_type TEXT NOT NULL,
      status TEXT NOT NULL,
      task_id TEXT,
      error_message TEXT,
      metadata TEXT,
      is_selected INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY(scene_id) REFERENCES script_scenes(id) ON DELETE CASCADE
    )
    `);

  // 资源下载状态表
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_downloads(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      remote_url TEXT NOT NULL,
      local_path TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      file_size INTEGER,
      downloaded_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(resource_type, resource_id)
    )
    `);

  // 生成操作快照表
  db.exec(`
    CREATE TABLE IF NOT EXISTS generation_snapshots(
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      script_id TEXT NOT NULL,
      scene_id TEXT NOT NULL,
      video_id TEXT,
      original_prompt TEXT,
      final_prompt TEXT,
      prompt_type TEXT,
      use_storyboard INTEGER,
      use_character_image INTEGER,
      aspect_ratio TEXT,
      character_id TEXT,
      character_name TEXT,
      digital_human_id TEXT,
      reference_image TEXT,
      scene_content TEXT,
      created_at TEXT DEFAULT(datetime('now'))
    )
    `);

  // 场景提示词缓存表（每个场景一条记录，用于页面刷新后恢复）
  db.exec(`
    CREATE TABLE IF NOT EXISTS scene_prompt_cache(
      scene_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      script_id TEXT NOT NULL,
      prompt_en TEXT,
      prompt_zh TEXT,
      prompt_type TEXT,
      use_storyboard INTEGER DEFAULT 0,
      use_character_image INTEGER DEFAULT 1,
      aspect_ratio TEXT DEFAULT '16:9',
      character_id TEXT,
      character_name TEXT,
      digital_human_id TEXT,
      reference_image TEXT,
      image_source TEXT,
      with_voice INTEGER DEFAULT 1,
      voice_language TEXT DEFAULT 'zh',
      updated_at TEXT DEFAULT(datetime('now'))
    )
    `);

  // 供应商图片上传记录表（缓存本地资源与远程URL的映射）
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_upload_records(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_resource_hash TEXT NOT NULL,
      local_path TEXT,
      provider_name TEXT NOT NULL,
      remote_url TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(local_resource_hash, provider_name)
    )
    `);

  // AI 工具配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_tool_configs (
      id TEXT PRIMARY KEY,
      tool_type TEXT NOT NULL,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_name TEXT,
      description TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )
    `);

  // 对话会话表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      model_config_id TEXT,
      tool_type TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    )
    `);

  // 对话消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model_name TEXT,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    )
    `);

  // AI 使用日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id TEXT PRIMARY KEY,
      tool_type TEXT NOT NULL,
      model_name TEXT,
      model_config_id TEXT,
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT,
      duration_ms INTEGER,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      total_tokens INTEGER,
      request_body TEXT,
      response_body TEXT,
      user_input TEXT,
      ai_output TEXT,
      conversation_id TEXT,
      base_url TEXT,
      temperature REAL,
      max_tokens INTEGER,
      extra_data TEXT,
      created_at DATETIME NOT NULL
    )
    `);

  // 迁移：为旧表添加新列（如果不存在）
  try {
    db.exec(`ALTER TABLE scene_prompt_cache ADD COLUMN with_voice INTEGER DEFAULT 1`);
  } catch { /* 列已存在，忽略 */ }
  try {
    db.exec(`ALTER TABLE scene_prompt_cache ADD COLUMN voice_language TEXT DEFAULT 'zh'`);
  } catch { /* 列已存在，忽略 */ }

  // 迁移：将 project_characters 的 project_id 改为允许为 null
  try {
    const tableInfo = db.prepare("PRAGMA table_info(project_characters)").all();
    const projectIdCol = (tableInfo as any[]).find((col) => col.name === 'project_id');
    if (projectIdCol && projectIdCol.notnull === 1) {
      console.log('Migrating project_characters to allow null project_id');
      db.exec(`
          CREATE TABLE new_project_characters(
      id TEXT PRIMARY KEY,
      project_id TEXT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      avatar_url TEXT,
      attributes TEXT,
      sort_order INTEGER NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
          INSERT INTO new_project_characters SELECT * FROM project_characters;
          DROP TABLE project_characters;
          ALTER TABLE new_project_characters RENAME TO project_characters;
  `);
    }
  } catch (error) { console.error('Error migrating project_characters:', error); }

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
      INSERT OR REPLACE INTO users(user_id, username, email, updated_at)
  VALUES(?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(user.id || user.user_id, user.username || user.name || '', user.email || '');
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
      INSERT INTO activation_records(code, type, activated_at, expires_at)
  VALUES(?, ?, ?, ?)
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
      INSERT OR REPLACE INTO app_settings(key, value, updated_at)
  VALUES(?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
    return true;
  } catch (error) {
    console.error('Error saving setting:', error);
    return false;
  }
}

// ==================== 项目管理 ====================

// 保存项目
export function saveProject(project: any) {
  if (!db) return false;

  // 必须有 id 才能保存
  if (!project.id) {
    console.warn('Skipping saveProject: missing id');
    return false;
  }

  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO projects(
      id, user_id, topic, title, status, current_step,
      theme_name, theme_desc, created_at, updated_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
    stmt.run(
      project.id,
      project.userId || '',
      project.topic || '',
      project.title || null,
      project.status || 'DRAFT',
      project.currentStep || 'TOPIC_INPUT',
      project.themeName || null,
      project.themeDesc || null,
      project.createdAt || now,
      project.updatedAt || now
    );
    return true;
  } catch (error) {
    console.error('Error saving project:', error);
    return false;
  }
}

// 获取项目
export function getProject(projectId: string) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const row: any = stmt.get(projectId);
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      topic: row.topic,
      title: row.title,
      status: row.status,
      currentStep: row.current_step,
      themeName: row.theme_name,
      themeDesc: row.theme_desc,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

// 获取所有项目
export function getProjects() {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
    const rows: any[] = stmt.all();
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      topic: row.topic,
      title: row.title,
      status: row.status,
      currentStep: row.current_step,
      themeName: row.theme_name,
      themeDesc: row.theme_desc,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

// 删除项目
export function deleteProject(projectId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(projectId);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// ==================== 角色管理 ====================

// 保存角色
export function saveCharacter(character: any) {
  if (!db) return false;

  // 必须有 id 才能保存
  if (!character.id) {
    console.warn('Skipping saveCharacter: missing id');
    return false;
  }

  try {
    // 先检查 project 是否存在（如果有 projectId 的话），不存在则跳过（避免 FK 约束失败）
    if (character.projectId) {
      const checkStmt = db.prepare('SELECT id FROM projects WHERE id = ?');
      const project = checkStmt.get(character.projectId);

      if (!project) {
        console.warn('Skipping saveCharacter: project not found:', character.projectId);
        return false;
      }
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO project_characters(
        id, project_id, name, description, avatar_url,
        attributes, sort_order, created_at, updated_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    stmt.run(
      character.id,
      character.projectId || null,
      character.name || '',
      character.description || '',
      character.avatarUrl || null,
      character.attributes ? JSON.stringify(character.attributes) : null,
      character.sortOrder ?? 0,
      character.createdAt || now,
      character.updatedAt || now
    );
    return true;
  } catch (error) {
    console.error('Error saving character:', error);
    return false;
  }
}

// 获取项目的所有角色
export function getProjectCharacters(projectId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM project_characters WHERE project_id = ? ORDER BY sort_order');
    const rows: any[] = stmt.all(projectId);
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      avatarUrl: row.avatar_url,
      attributes: row.attributes ? JSON.parse(row.attributes) : null,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting project characters:', error);
    return [];
  }
}

// 获取所有角色
export function getAllCharacters() {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM project_characters ORDER BY updated_at DESC');
    const rows: any[] = stmt.all();
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      avatarUrl: row.avatar_url,
      attributes: row.attributes ? JSON.parse(row.attributes) : null,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting all characters:', error);
    return [];
  }
}

// 删除角色
export function deleteCharacter(characterId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM project_characters WHERE id = ?');
    stmt.run(characterId);
    return true;
  } catch (error) {
    console.error('Error deleting character:', error);
    return false;
  }
}

// ==================== 数字人管理 ====================

// 保存数字人
export function saveDigitalHuman(digitalHuman: any) {
  if (!db) return false;
  try {
    // 先检查 character 是否存在
    const checkStmt = db.prepare('SELECT id FROM project_characters WHERE id = ?');
    const character = checkStmt.get(digitalHuman.characterId);

    if (!character) {
      console.error('Error saving digital human: Character not found:', digitalHuman.characterId);
      return false;
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO digital_humans(
          id, character_id, image_url, prompt, is_selected, created_at
        ) VALUES(?, ?, ?, ?, ?, ?)
          `);
    stmt.run(
      digitalHuman.id,
      digitalHuman.characterId,
      digitalHuman.imageUrl,
      digitalHuman.prompt,
      digitalHuman.isSelected ? 1 : 0,
      digitalHuman.createdAt
    );
    return true;
  } catch (error) {
    console.error('Error saving digital human:', error);
    return false;
  }
}

// 获取角色的数字人列表
export function getDigitalHumans(characterId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM digital_humans WHERE character_id = ? ORDER BY created_at DESC');
    const rows: any[] = stmt.all(characterId);
    return rows.map((row) => ({
      id: row.id,
      characterId: row.character_id,
      imageUrl: row.image_url,
      prompt: row.prompt,
      isSelected: row.is_selected === 1,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error getting digital humans:', error);
    return [];
  }
}

// 删除数字人
export function deleteDigitalHuman(digitalHumanId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM digital_humans WHERE id = ?');
    stmt.run(digitalHumanId);
    return true;
  } catch (error) {
    console.error('Error deleting digital human:', error);
    return false;
  }
}

// ==================== 剧本管理 ====================

// 保存剧本
export function saveScript(script: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO project_scripts(
            id, project_id, character_id, title, description,
            version, is_active, created_at, updated_at
          ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
    stmt.run(
      script.id,
      script.projectId,
      script.characterId,
      script.title,
      script.description,
      script.version,
      script.isActive ? 1 : 0,
      script.createdAt,
      script.updatedAt
    );
    return true;
  } catch (error) {
    console.error('Error saving script:', error);
    return false;
  }
}

// 获取项目剧本
export function getProjectScripts(projectId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM project_scripts WHERE project_id = ? ORDER BY created_at DESC');
    const rows: any[] = stmt.all(projectId);
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      characterId: row.character_id,
      title: row.title,
      description: row.description,
      version: row.version,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting project scripts:', error);
    return [];
  }
}

// 删除剧本
export function deleteScript(scriptId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM project_scripts WHERE id = ?');
    stmt.run(scriptId);
    return true;
  } catch (error) {
    console.error('Error deleting script:', error);
    return false;
  }
}

// ==================== 场景管理 ====================

// 保存场景
export function saveScene(scene: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO script_scenes(
              id, script_id, title, sort_order, duration,
              content, created_at, updated_at
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
              `);
    stmt.run(
      scene.id,
      scene.scriptId,
      scene.title,
      scene.sortOrder,
      scene.duration,
      JSON.stringify(scene.content),
      scene.createdAt,
      scene.updatedAt
    );
    return true;
  } catch (error) {
    console.error('Error saving scene:', error);
    return false;
  }
}

// 获取剧本场景
export function getScriptScenes(scriptId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM script_scenes WHERE script_id = ? ORDER BY sort_order');
    const rows: any[] = stmt.all(scriptId);
    return rows.map((row) => ({
      id: row.id,
      scriptId: row.script_id,
      title: row.title,
      sortOrder: row.sort_order,
      duration: row.duration,
      content: JSON.parse(row.content),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting script scenes:', error);
    return [];
  }
}

// 删除场景
export function deleteScene(sceneId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM script_scenes WHERE id = ?');
    stmt.run(sceneId);
    return true;
  } catch (error) {
    console.error('Error deleting scene:', error);
    return false;
  }
}

// ==================== 场景视频管理 ====================

// 保存场景视频
export function saveSceneVideo(video: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO scene_videos(
                id, scene_id, video_url, thumbnail_url, duration,
                prompt, prompt_type, status, task_id, error_message,
                metadata, is_selected, created_at, updated_at
              ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
    stmt.run(
      video.id,
      video.sceneId,
      video.videoUrl,
      video.thumbnailUrl,
      video.duration,
      video.prompt,
      video.promptType,
      video.status,
      video.taskId,
      video.errorMessage,
      video.metadata ? JSON.stringify(video.metadata) : null,
      video.isSelected ? 1 : 0,
      video.createdAt,
      video.updatedAt
    );
    return true;
  } catch (error) {
    console.error('Error saving scene video:', error);
    return false;
  }
}

// 获取场景视频
export function getSceneVideos(sceneId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM scene_videos WHERE scene_id = ? ORDER BY created_at DESC');
    const rows: any[] = stmt.all(sceneId);
    return rows.map((row) => ({
      id: row.id,
      sceneId: row.scene_id,
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url,
      duration: row.duration,
      prompt: row.prompt,
      promptType: row.prompt_type,
      status: row.status,
      taskId: row.task_id,
      errorMessage: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      isSelected: row.is_selected === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting scene videos:', error);
    return [];
  }
}

// 删除场景视频
export function deleteSceneVideo(videoId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM scene_videos WHERE id = ?');
    stmt.run(videoId);
    return true;
  } catch (error) {
    console.error('Error deleting scene video:', error);
    return false;
  }
}

// ==================== 资源下载管理 ====================

// 保存资源下载记录
export function saveResourceDownload(download: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO resource_downloads(
                  resource_type, resource_id, remote_url, local_path,
                  status, error_message, file_size, downloaded_size, updated_at
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                  `);
    stmt.run(
      download.resourceType,
      download.resourceId,
      download.remoteUrl,
      download.localPath,
      download.status,
      download.errorMessage,
      download.fileSize,
      download.downloadedSize
    );
    return true;
  } catch (error) {
    console.error('Error saving resource download:', error);
    return false;
  }
}

// 获取资源下载状态
export function getResourceDownload(resourceType: string, resourceId: string) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM resource_downloads WHERE resource_type = ? AND resource_id = ?');
    const row: any = stmt.get(resourceType, resourceId);
    if (!row) return null;

    return {
      id: row.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      remoteUrl: row.remote_url,
      localPath: row.local_path,
      status: row.status,
      errorMessage: row.error_message,
      fileSize: row.file_size,
      downloadedSize: row.downloaded_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting resource download:', error);
    return null;
  }
}

// 更新资源下载状态
export function updateResourceDownload(resourceType: string, resourceId: string, updates: any) {
  if (!db) return false;
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.localPath !== undefined) {
      fields.push('local_path = ?');
      values.push(updates.localPath);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.errorMessage !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.downloadedSize !== undefined) {
      fields.push('downloaded_size = ?');
      values.push(updates.downloadedSize);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(resourceType, resourceId);

    const stmt = db.prepare(`
      UPDATE resource_downloads
      SET ${fields.join(', ')}
      WHERE resource_type = ? AND resource_id = ?
    `);
    stmt.run(...values);
    return true;
  } catch (error) {
    console.error('Error updating resource download:', error);
    return false;
  }
}

// ==================== 生成快照管理 ====================

// 保存生成快照
export function saveGenerationSnapshot(snapshot: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO generation_snapshots(
      id, project_id, script_id, scene_id, video_id,
      original_prompt, final_prompt, prompt_type,
      use_storyboard, use_character_image, aspect_ratio,
      character_id, character_name, digital_human_id,
      reference_image, scene_content, created_at
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
    stmt.run(
      snapshot.id,
      snapshot.projectId,
      snapshot.scriptId,
      snapshot.sceneId,
      snapshot.videoId || null,
      snapshot.originalPrompt,
      snapshot.finalPrompt,
      snapshot.promptType,
      snapshot.useStoryboard ? 1 : 0,
      snapshot.useCharacterImage ? 1 : 0,
      snapshot.aspectRatio,
      snapshot.characterId || null,
      snapshot.characterName || null,
      snapshot.digitalHumanId || null,
      snapshot.referenceImage || null,
      snapshot.sceneContent,
      snapshot.createdAt || new Date().toISOString()
    );
    return true;
  } catch (error) {
    console.error('Error saving generation snapshot:', error);
    return false;
  }
}

// 获取场景的生成快照
export function getGenerationSnapshots(sceneId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM generation_snapshots WHERE scene_id = ? ORDER BY created_at DESC');
    const rows: any[] = stmt.all(sceneId);
    return rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      scriptId: row.script_id,
      sceneId: row.scene_id,
      videoId: row.video_id,
      originalPrompt: row.original_prompt,
      finalPrompt: row.final_prompt,
      promptType: row.prompt_type,
      useStoryboard: row.use_storyboard === 1,
      useCharacterImage: row.use_character_image === 1,
      aspectRatio: row.aspect_ratio,
      characterId: row.character_id,
      characterName: row.character_name,
      digitalHumanId: row.digital_human_id,
      referenceImage: row.reference_image,
      sceneContent: row.scene_content,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error getting generation snapshots:', error);
    return [];
  }
}

// ==================== 场景提示词缓存管理 ====================

// 保存/更新场景提示词缓存（按 scene_id 唯一）
export function saveScenePromptCache(cache: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO scene_prompt_cache(
        scene_id, project_id, script_id,
        prompt_en, prompt_zh, prompt_type,
        use_storyboard, use_character_image, aspect_ratio,
        character_id, character_name, digital_human_id,
        reference_image, image_source,
        with_voice, voice_language, updated_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    stmt.run(
      cache.sceneId,
      cache.projectId,
      cache.scriptId,
      cache.promptEn || null,
      cache.promptZh || null,
      cache.promptType || null,
      cache.useStoryboard ? 1 : 0,
      cache.useCharacterImage !== false ? 1 : 0,
      cache.aspectRatio || '16:9',
      cache.characterId || null,
      cache.characterName || null,
      cache.digitalHumanId || null,
      cache.referenceImage || null,
      cache.imageSource || null,
      cache.withVoice !== false ? 1 : 0,
      cache.voiceLanguage || 'zh',
      new Date().toISOString()
    );
    return true;
  } catch (error) {
    console.error('Error saving scene prompt cache:', error);
    return false;
  }
}

// 获取场景的提示词缓存
export function getScenePromptCache(sceneId: string) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM scene_prompt_cache WHERE scene_id = ?');
    const row: any = stmt.get(sceneId);
    if (!row) return null;

    return {
      sceneId: row.scene_id,
      projectId: row.project_id,
      scriptId: row.script_id,
      promptEn: row.prompt_en,
      promptZh: row.prompt_zh,
      promptType: row.prompt_type,
      useStoryboard: row.use_storyboard === 1,
      useCharacterImage: row.use_character_image === 1,
      aspectRatio: row.aspect_ratio,
      characterId: row.character_id,
      characterName: row.character_name,
      digitalHumanId: row.digital_human_id,
      referenceImage: row.reference_image,
      imageSource: row.image_source,
      withVoice: row.with_voice === 1,
      voiceLanguage: row.voice_language || 'zh',
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting scene prompt cache:', error);
    return null;
  }
}

// ==================== 供应商上传记录管理 ====================

// 查询上传记录（通过 hash + providerName）
export function getProviderUploadRecord(localResourceHash: string, providerName: string) {
  if (!db) return null;
  try {
    const stmt = db.prepare(
      'SELECT * FROM provider_upload_records WHERE local_resource_hash = ? AND provider_name = ?'
    );
    const row: any = stmt.get(localResourceHash, providerName);
    if (!row) return null;

    return {
      id: row.id,
      localResourceHash: row.local_resource_hash,
      localPath: row.local_path,
      providerName: row.provider_name,
      remoteUrl: row.remote_url,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  } catch (error) {
    console.error('Error getting provider upload record:', error);
    return null;
  }
}

// 保存上传记录
export function saveProviderUploadRecord(record: any) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO provider_upload_records(
          local_resource_hash, local_path, provider_name, remote_url,
          file_size, mime_type, expires_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?)
          `);
    stmt.run(
      record.localResourceHash,
      record.localPath || null,
      record.providerName,
      record.remoteUrl,
      record.fileSize || null,
      record.mimeType || null,
      record.expiresAt || null
    );
    return true;
  } catch (error) {
    console.error('Error saving provider upload record:', error);
    return false;
  }
}

// 删除上传记录
export function deleteProviderUploadRecord(localResourceHash: string, providerName: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare(
      'DELETE FROM provider_upload_records WHERE local_resource_hash = ? AND provider_name = ?'
    );
    stmt.run(localResourceHash, providerName);
    return true;
  } catch (error) {
    console.error('Error deleting provider upload record:', error);
    return false;
  }
}

// ==================== AI 工具配置管理 ====================

// 保存 AI 工具配置
export function saveAiToolConfig(config: any) {
  if (!db) return false;
  if (!config.id) {
    console.warn('Skipping saveAiToolConfig: missing id');
    return false;
  }
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ai_tool_configs(
        id, tool_type, name, provider, base_url, api_key,
        model_name, description, is_default, sort_order,
        created_at, updated_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      config.id,
      config.toolType,
      config.name,
      config.provider,
      config.baseUrl,
      config.apiKey,
      config.modelName || null,
      config.description || null,
      config.isDefault ? 1 : 0,
      config.sortOrder ?? 0,
      config.createdAt || now,
      config.updatedAt || now
    );
    return true;
  } catch (error) {
    console.error('Error saving AI tool config:', error);
    return false;
  }
}

// 获取所有 AI 工具配置
export function getAiToolConfigs() {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM ai_tool_configs ORDER BY tool_type, sort_order, created_at DESC');
    const rows: any[] = stmt.all();
    return rows.map(mapAiToolConfigRow);
  } catch (error) {
    console.error('Error getting AI tool configs:', error);
    return [];
  }
}

// 按类型获取 AI 工具配置
export function getAiToolConfigsByType(toolType: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM ai_tool_configs WHERE tool_type = ? ORDER BY sort_order, created_at DESC');
    const rows: any[] = stmt.all(toolType);
    return rows.map(mapAiToolConfigRow);
  } catch (error) {
    console.error('Error getting AI tool configs by type:', error);
    return [];
  }
}

// 获取某类型的默认配置
export function getDefaultAiToolConfig(toolType: string) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM ai_tool_configs WHERE tool_type = ? AND is_default = 1 LIMIT 1');
    const row: any = stmt.get(toolType);
    if (!row) return null;
    return mapAiToolConfigRow(row);
  } catch (error) {
    console.error('Error getting default AI tool config:', error);
    return null;
  }
}

// 设置默认 AI 工具配置（先清除同类型的其他默认，再设置指定的）
export function setDefaultAiToolConfig(toolType: string, configId: string) {
  if (!db) return false;
  try {
    const now = new Date().toISOString();
    db.prepare('UPDATE ai_tool_configs SET is_default = 0, updated_at = ? WHERE tool_type = ?').run(now, toolType);
    db.prepare('UPDATE ai_tool_configs SET is_default = 1, updated_at = ? WHERE id = ?').run(now, configId);
    return true;
  } catch (error) {
    console.error('Error setting default AI tool config:', error);
    return false;
  }
}

// 删除 AI 工具配置
export function deleteAiToolConfig(configId: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare('DELETE FROM ai_tool_configs WHERE id = ?');
    stmt.run(configId);
    return true;
  } catch (error) {
    console.error('Error deleting AI tool config:', error);
    return false;
  }
}

// 内部辅助：row → camelCase 对象
function mapAiToolConfigRow(row: any) {
  return {
    id: row.id,
    toolType: row.tool_type,
    name: row.name,
    provider: row.provider,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    modelName: row.model_name,
    description: row.description,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== 对话会话管理 ====================

// 保存对话会话
export function saveChatConversation(conversation: any) {
  if (!db) return false;
  if (!conversation.id) return false;
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO chat_conversations(
        id, title, model_config_id, tool_type, created_at, updated_at
      ) VALUES(?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      conversation.id,
      conversation.title || '新对话',
      conversation.modelConfigId || null,
      conversation.toolType,
      conversation.createdAt || now,
      conversation.updatedAt || now
    );
    return true;
  } catch (error) {
    console.error('Error saving chat conversation:', error);
    return false;
  }
}

// 获取所有对话会话
export function getChatConversations() {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM chat_conversations ORDER BY updated_at DESC');
    const rows: any[] = stmt.all();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      modelConfigId: row.model_config_id,
      toolType: row.tool_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting chat conversations:', error);
    return [];
  }
}

// 删除对话会话（级联删除消息）
export function deleteChatConversation(conversationId: string) {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(conversationId);
    db.prepare('DELETE FROM chat_conversations WHERE id = ?').run(conversationId);
    return true;
  } catch (error) {
    console.error('Error deleting chat conversation:', error);
    return false;
  }
}

// 更新对话标题
export function updateChatConversationTitle(conversationId: string, title: string) {
  if (!db) return false;
  try {
    const now = new Date().toISOString();
    db.prepare('UPDATE chat_conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, now, conversationId);
    return true;
  } catch (error) {
    console.error('Error updating chat conversation title:', error);
    return false;
  }
}

// ==================== 对话消息管理 ====================

// 保存对话消息
export function saveChatMessage(message: any) {
  if (!db) return false;
  if (!message.id) return false;
  try {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO chat_messages(
        id, conversation_id, role, content, model_name, created_at
      ) VALUES(?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      message.id,
      message.conversationId,
      message.role,
      message.content,
      message.modelName || null,
      message.createdAt || now
    );
    // 更新会话的 updated_at
    db.prepare('UPDATE chat_conversations SET updated_at = ? WHERE id = ?').run(now, message.conversationId);
    return true;
  } catch (error) {
    console.error('Error saving chat message:', error);
    return false;
  }
}

// 获取对话消息
export function getChatMessages(conversationId: string) {
  if (!db) return [];
  try {
    const stmt = db.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC');
    const rows: any[] = stmt.all(conversationId);
    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      modelName: row.model_name,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error getting chat messages:', error);
    return [];
  }
}

// 删除对话的所有消息
export function deleteChatMessages(conversationId: string) {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?').run(conversationId);
    return true;
  } catch (error) {
    console.error('Error deleting chat messages:', error);
    return false;
  }
}

// ==================== AI 使用日志管理 ====================

// 保存使用日志
export function saveAiUsageLog(log: any) {
  if (!db) return false;
  if (!log.id) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO ai_usage_logs(
        id, tool_type, model_name, model_config_id, status, error_message,
        duration_ms, prompt_tokens, completion_tokens, total_tokens,
        request_body, response_body, user_input, ai_output,
        conversation_id, base_url, temperature, max_tokens,
        extra_data, created_at
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      log.id,
      log.toolType,
      log.modelName || null,
      log.modelConfigId || null,
      log.status || 'success',
      log.errorMessage || null,
      log.durationMs || null,
      log.promptTokens || null,
      log.completionTokens || null,
      log.totalTokens || null,
      log.requestBody || null,
      log.responseBody || null,
      log.userInput || null,
      log.aiOutput || null,
      log.conversationId || null,
      log.baseUrl || null,
      log.temperature ?? null,
      log.maxTokens || null,
      log.extraData ? (typeof log.extraData === 'string' ? log.extraData : JSON.stringify(log.extraData)) : null,
      log.createdAt || new Date().toISOString()
    );
    return true;
  } catch (error) {
    console.error('Error saving AI usage log:', error);
    return false;
  }
}

// 查询使用日志（分页 + 筛选）
export function getAiUsageLogs(query: any) {
  if (!db) return { logs: [], total: 0 };
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.toolType) {
      conditions.push('tool_type = ?');
      params.push(query.toolType);
    }
    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }
    if (query.startDate) {
      conditions.push('created_at >= ?');
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push('created_at <= ?');
      params.push(query.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 总数
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM ai_usage_logs ${where}`);
    const countRow: any = countStmt.get(...params);
    const total = countRow?.total || 0;

    // 分页数据
    const dataStmt = db.prepare(
      `SELECT * FROM ai_usage_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const rows: any[] = dataStmt.all(...params, pageSize, offset);

    const logs = rows.map(mapAiUsageLogRow);
    return { logs, total };
  } catch (error) {
    console.error('Error getting AI usage logs:', error);
    return { logs: [], total: 0 };
  }
}

// 获取汇总统计
export function getUsageStatsSummary(query: any) {
  if (!db) return { totalCount: 0, successCount: 0, errorCount: 0, totalTokens: 0, totalDurationMs: 0 };
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.toolType) {
      conditions.push('tool_type = ?');
      params.push(query.toolType);
    }
    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }
    if (query.startDate) {
      conditions.push('created_at >= ?');
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push('created_at <= ?');
      params.push(query.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(duration_ms), 0) as total_duration_ms
      FROM ai_usage_logs ${where}
    `);
    const row: any = stmt.get(...params);
    return {
      totalCount: row?.total_count || 0,
      successCount: row?.success_count || 0,
      errorCount: row?.error_count || 0,
      totalTokens: row?.total_tokens || 0,
      totalDurationMs: row?.total_duration_ms || 0,
    };
  } catch (error) {
    console.error('Error getting usage stats summary:', error);
    return { totalCount: 0, successCount: 0, errorCount: 0, totalTokens: 0, totalDurationMs: 0 };
  }
}

// 获取每日统计
export function getDailyUsageStats(query: any) {
  if (!db) return [];
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.toolType) {
      conditions.push('tool_type = ?');
      params.push(query.toolType);
    }
    if (query.status) {
      conditions.push('status = ?');
      params.push(query.status);
    }
    if (query.startDate) {
      conditions.push('created_at >= ?');
      params.push(query.startDate);
    }
    if (query.endDate) {
      conditions.push('created_at <= ?');
      params.push(query.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as count,
        COALESCE(SUM(total_tokens), 0) as tokens
      FROM ai_usage_logs ${where}
      GROUP BY date(created_at)
      ORDER BY date ASC
    `);
    const rows: any[] = stmt.all(...params);
    return rows.map((row) => ({
      date: row.date,
      count: row.count,
      tokens: row.tokens,
    }));
  } catch (error) {
    console.error('Error getting daily usage stats:', error);
    return [];
  }
}

// 删除单条日志
export function deleteAiUsageLog(logId: string) {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM ai_usage_logs WHERE id = ?').run(logId);
    return true;
  } catch (error) {
    console.error('Error deleting AI usage log:', error);
    return false;
  }
}

// 清空所有日志
export function clearAiUsageLogs() {
  if (!db) return false;
  try {
    db.prepare('DELETE FROM ai_usage_logs').run();
    return true;
  } catch (error) {
    console.error('Error clearing AI usage logs:', error);
    return false;
  }
}

// 内部辅助：row → camelCase
function mapAiUsageLogRow(row: any) {
  return {
    id: row.id,
    toolType: row.tool_type,
    modelName: row.model_name,
    modelConfigId: row.model_config_id,
    status: row.status,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    requestBody: row.request_body,
    responseBody: row.response_body,
    userInput: row.user_input,
    aiOutput: row.ai_output,
    conversationId: row.conversation_id,
    baseUrl: row.base_url,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    extraData: row.extra_data,
    createdAt: row.created_at,
  };
}
