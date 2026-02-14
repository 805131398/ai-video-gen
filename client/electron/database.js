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
exports.getSetting = getSetting;
exports.saveSetting = saveSetting;
exports.saveProject = saveProject;
exports.getProject = getProject;
exports.getProjects = getProjects;
exports.deleteProject = deleteProject;
exports.saveCharacter = saveCharacter;
exports.getProjectCharacters = getProjectCharacters;
exports.deleteCharacter = deleteCharacter;
exports.saveDigitalHuman = saveDigitalHuman;
exports.getDigitalHumans = getDigitalHumans;
exports.deleteDigitalHuman = deleteDigitalHuman;
exports.saveScript = saveScript;
exports.getProjectScripts = getProjectScripts;
exports.deleteScript = deleteScript;
exports.saveScene = saveScene;
exports.getScriptScenes = getScriptScenes;
exports.deleteScene = deleteScene;
exports.saveSceneVideo = saveSceneVideo;
exports.getSceneVideos = getSceneVideos;
exports.deleteSceneVideo = deleteSceneVideo;
exports.saveResourceDownload = saveResourceDownload;
exports.getResourceDownload = getResourceDownload;
exports.updateResourceDownload = updateResourceDownload;
exports.saveGenerationSnapshot = saveGenerationSnapshot;
exports.getGenerationSnapshots = getGenerationSnapshots;
exports.saveScenePromptCache = saveScenePromptCache;
exports.getScenePromptCache = getScenePromptCache;
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
      project_id TEXT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS digital_humans (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      prompt TEXT NOT NULL,
      is_selected INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (character_id) REFERENCES project_characters(id) ON DELETE CASCADE
    )
  `);
    // 项目剧本表
    db.exec(`
    CREATE TABLE IF NOT EXISTS project_scripts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      version INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES project_characters(id)
    )
  `);
    // 剧本场景表
    db.exec(`
    CREATE TABLE IF NOT EXISTS script_scenes (
      id TEXT PRIMARY KEY,
      script_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      duration INTEGER,
      content TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL,
      FOREIGN KEY (script_id) REFERENCES project_scripts(id) ON DELETE CASCADE
    )
  `);
    // 场景视频表
    db.exec(`
    CREATE TABLE IF NOT EXISTS scene_videos (
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
      FOREIGN KEY (scene_id) REFERENCES script_scenes(id) ON DELETE CASCADE
    )
  `);
    // 资源下载状态表
    db.exec(`
    CREATE TABLE IF NOT EXISTS resource_downloads (
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
    CREATE TABLE IF NOT EXISTS generation_snapshots (
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
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
    // 场景提示词缓存表（每个场景一条记录，用于页面刷新后恢复）
    db.exec(`
    CREATE TABLE IF NOT EXISTS scene_prompt_cache (
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
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
    // 迁移：为旧表添加新列（如果不存在）
    try {
        db.exec(`ALTER TABLE scene_prompt_cache ADD COLUMN with_voice INTEGER DEFAULT 1`);
    }
    catch { /* 列已存在，忽略 */ }
    try {
        db.exec(`ALTER TABLE scene_prompt_cache ADD COLUMN voice_language TEXT DEFAULT 'zh'`);
    }
    catch { /* 列已存在，忽略 */ }
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
// 获取设置
function getSetting(key) {
    if (!db)
        return null;
    const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
    const row = stmt.get(key);
    return row?.value || null;
}
// 保存设置
function saveSetting(key, value) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
        stmt.run(key, value);
        return true;
    }
    catch (error) {
        console.error('Error saving setting:', error);
        return false;
    }
}
// ==================== 项目管理 ====================
// 保存项目
function saveProject(project) {
    if (!db)
        return false;
    // 必须有 id 才能保存
    if (!project.id) {
        console.warn('Skipping saveProject: missing id');
        return false;
    }
    try {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO projects (
        id, user_id, topic, title, status, current_step,
        theme_name, theme_desc, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(project.id, project.userId || '', project.topic || '', project.title || null, project.status || 'DRAFT', project.currentStep || 'TOPIC_INPUT', project.themeName || null, project.themeDesc || null, project.createdAt || now, project.updatedAt || now);
        return true;
    }
    catch (error) {
        console.error('Error saving project:', error);
        return false;
    }
}
// 获取项目
function getProject(projectId) {
    if (!db)
        return null;
    try {
        const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
        const row = stmt.get(projectId);
        if (!row)
            return null;
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
    }
    catch (error) {
        console.error('Error getting project:', error);
        return null;
    }
}
// 获取所有项目
function getProjects() {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
        const rows = stmt.all();
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
    }
    catch (error) {
        console.error('Error getting projects:', error);
        return [];
    }
}
// 删除项目
function deleteProject(projectId) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
        stmt.run(projectId);
        return true;
    }
    catch (error) {
        console.error('Error deleting project:', error);
        return false;
    }
}
// ==================== 角色管理 ====================
// 保存角色
function saveCharacter(character) {
    if (!db)
        return false;
    // 必须有 id 和 projectId 才能保存
    if (!character.id || !character.projectId) {
        console.warn('Skipping saveCharacter: missing id or projectId');
        return false;
    }
    try {
        // 先检查 project 是否存在，不存在则跳过（避免 FK 约束失败）
        const checkStmt = db.prepare('SELECT id FROM projects WHERE id = ?');
        const project = checkStmt.get(character.projectId);
        if (!project) {
            console.warn('Skipping saveCharacter: project not found:', character.projectId);
            return false;
        }
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO project_characters (
        id, project_id, name, description, avatar_url,
        attributes, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(character.id, character.projectId, character.name || '', character.description || '', character.avatarUrl || null, character.attributes ? JSON.stringify(character.attributes) : null, character.sortOrder ?? 0, character.createdAt || now, character.updatedAt || now);
        return true;
    }
    catch (error) {
        console.error('Error saving character:', error);
        return false;
    }
}
// 获取项目的所有角色
function getProjectCharacters(projectId) {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM project_characters WHERE project_id = ? ORDER BY sort_order');
        const rows = stmt.all(projectId);
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
    }
    catch (error) {
        console.error('Error getting project characters:', error);
        return [];
    }
}
// 删除角色
function deleteCharacter(characterId) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare('DELETE FROM project_characters WHERE id = ?');
        stmt.run(characterId);
        return true;
    }
    catch (error) {
        console.error('Error deleting character:', error);
        return false;
    }
}
// ==================== 数字人管理 ====================
// 保存数字人
function saveDigitalHuman(digitalHuman) {
    if (!db)
        return false;
    try {
        // 先检查 character 是否存在
        const checkStmt = db.prepare('SELECT id FROM project_characters WHERE id = ?');
        const character = checkStmt.get(digitalHuman.characterId);
        if (!character) {
            console.error('Error saving digital human: Character not found:', digitalHuman.characterId);
            return false;
        }
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO digital_humans (
        id, character_id, image_url, prompt, is_selected, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(digitalHuman.id, digitalHuman.characterId, digitalHuman.imageUrl, digitalHuman.prompt, digitalHuman.isSelected ? 1 : 0, digitalHuman.createdAt);
        return true;
    }
    catch (error) {
        console.error('Error saving digital human:', error);
        return false;
    }
}
// 获取角色的数字人列表
function getDigitalHumans(characterId) {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM digital_humans WHERE character_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(characterId);
        return rows.map((row) => ({
            id: row.id,
            characterId: row.character_id,
            imageUrl: row.image_url,
            prompt: row.prompt,
            isSelected: row.is_selected === 1,
            createdAt: row.created_at,
        }));
    }
    catch (error) {
        console.error('Error getting digital humans:', error);
        return [];
    }
}
// 删除数字人
function deleteDigitalHuman(digitalHumanId) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare('DELETE FROM digital_humans WHERE id = ?');
        stmt.run(digitalHumanId);
        return true;
    }
    catch (error) {
        console.error('Error deleting digital human:', error);
        return false;
    }
}
// ==================== 剧本管理 ====================
// 保存剧本
function saveScript(script) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO project_scripts (
        id, project_id, character_id, title, description,
        version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(script.id, script.projectId, script.characterId, script.title, script.description, script.version, script.isActive ? 1 : 0, script.createdAt, script.updatedAt);
        return true;
    }
    catch (error) {
        console.error('Error saving script:', error);
        return false;
    }
}
// 获取项目剧本
function getProjectScripts(projectId) {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM project_scripts WHERE project_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(projectId);
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
    }
    catch (error) {
        console.error('Error getting project scripts:', error);
        return [];
    }
}
// 删除剧本
function deleteScript(scriptId) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare('DELETE FROM project_scripts WHERE id = ?');
        stmt.run(scriptId);
        return true;
    }
    catch (error) {
        console.error('Error deleting script:', error);
        return false;
    }
}
// ==================== 场景管理 ====================
// 保存场景
function saveScene(scene) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO script_scenes (
        id, script_id, title, sort_order, duration,
        content, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(scene.id, scene.scriptId, scene.title, scene.sortOrder, scene.duration, JSON.stringify(scene.content), scene.createdAt, scene.updatedAt);
        return true;
    }
    catch (error) {
        console.error('Error saving scene:', error);
        return false;
    }
}
// 获取剧本场景
function getScriptScenes(scriptId) {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM script_scenes WHERE script_id = ? ORDER BY sort_order');
        const rows = stmt.all(scriptId);
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
    }
    catch (error) {
        console.error('Error getting script scenes:', error);
        return [];
    }
}
// 删除场景
function deleteScene(sceneId) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare('DELETE FROM script_scenes WHERE id = ?');
        stmt.run(sceneId);
        return true;
    }
    catch (error) {
        console.error('Error deleting scene:', error);
        return false;
    }
}
// ==================== 场景视频管理 ====================
// 保存场景视频
function saveSceneVideo(video) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO scene_videos (
        id, scene_id, video_url, thumbnail_url, duration,
        prompt, prompt_type, status, task_id, error_message,
        metadata, is_selected, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(video.id, video.sceneId, video.videoUrl, video.thumbnailUrl, video.duration, video.prompt, video.promptType, video.status, video.taskId, video.errorMessage, video.metadata ? JSON.stringify(video.metadata) : null, video.isSelected ? 1 : 0, video.createdAt, video.updatedAt);
        return true;
    }
    catch (error) {
        console.error('Error saving scene video:', error);
        return false;
    }
}
// 获取场景视频
function getSceneVideos(sceneId) {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM scene_videos WHERE scene_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(sceneId);
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
    }
    catch (error) {
        console.error('Error getting scene videos:', error);
        return [];
    }
}
// 删除场景视频
function deleteSceneVideo(videoId) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare('DELETE FROM scene_videos WHERE id = ?');
        stmt.run(videoId);
        return true;
    }
    catch (error) {
        console.error('Error deleting scene video:', error);
        return false;
    }
}
// ==================== 资源下载管理 ====================
// 保存资源下载记录
function saveResourceDownload(download) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO resource_downloads (
        resource_type, resource_id, remote_url, local_path,
        status, error_message, file_size, downloaded_size, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
        stmt.run(download.resourceType, download.resourceId, download.remoteUrl, download.localPath, download.status, download.errorMessage, download.fileSize, download.downloadedSize);
        return true;
    }
    catch (error) {
        console.error('Error saving resource download:', error);
        return false;
    }
}
// 获取资源下载状态
function getResourceDownload(resourceType, resourceId) {
    if (!db)
        return null;
    try {
        const stmt = db.prepare('SELECT * FROM resource_downloads WHERE resource_type = ? AND resource_id = ?');
        const row = stmt.get(resourceType, resourceId);
        if (!row)
            return null;
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
    }
    catch (error) {
        console.error('Error getting resource download:', error);
        return null;
    }
}
// 更新资源下载状态
function updateResourceDownload(resourceType, resourceId, updates) {
    if (!db)
        return false;
    try {
        const fields = [];
        const values = [];
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
    }
    catch (error) {
        console.error('Error updating resource download:', error);
        return false;
    }
}
// ==================== 生成快照管理 ====================
// 保存生成快照
function saveGenerationSnapshot(snapshot) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO generation_snapshots (
        id, project_id, script_id, scene_id, video_id,
        original_prompt, final_prompt, prompt_type,
        use_storyboard, use_character_image, aspect_ratio,
        character_id, character_name, digital_human_id,
        reference_image, scene_content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(snapshot.id, snapshot.projectId, snapshot.scriptId, snapshot.sceneId, snapshot.videoId || null, snapshot.originalPrompt, snapshot.finalPrompt, snapshot.promptType, snapshot.useStoryboard ? 1 : 0, snapshot.useCharacterImage ? 1 : 0, snapshot.aspectRatio, snapshot.characterId || null, snapshot.characterName || null, snapshot.digitalHumanId || null, snapshot.referenceImage || null, snapshot.sceneContent, snapshot.createdAt || new Date().toISOString());
        return true;
    }
    catch (error) {
        console.error('Error saving generation snapshot:', error);
        return false;
    }
}
// 获取场景的生成快照
function getGenerationSnapshots(sceneId) {
    if (!db)
        return [];
    try {
        const stmt = db.prepare('SELECT * FROM generation_snapshots WHERE scene_id = ? ORDER BY created_at DESC');
        const rows = stmt.all(sceneId);
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
    }
    catch (error) {
        console.error('Error getting generation snapshots:', error);
        return [];
    }
}
// ==================== 场景提示词缓存管理 ====================
// 保存/更新场景提示词缓存（按 scene_id 唯一）
function saveScenePromptCache(cache) {
    if (!db)
        return false;
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO scene_prompt_cache (
        scene_id, project_id, script_id,
        prompt_en, prompt_zh, prompt_type,
        use_storyboard, use_character_image, aspect_ratio,
        character_id, character_name, digital_human_id,
        reference_image, image_source,
        with_voice, voice_language, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(cache.sceneId, cache.projectId, cache.scriptId, cache.promptEn || null, cache.promptZh || null, cache.promptType || null, cache.useStoryboard ? 1 : 0, cache.useCharacterImage !== false ? 1 : 0, cache.aspectRatio || '16:9', cache.characterId || null, cache.characterName || null, cache.digitalHumanId || null, cache.referenceImage || null, cache.imageSource || null, cache.withVoice !== false ? 1 : 0, cache.voiceLanguage || 'zh', new Date().toISOString());
        return true;
    }
    catch (error) {
        console.error('Error saving scene prompt cache:', error);
        return false;
    }
}
// 获取场景的提示词缓存
function getScenePromptCache(sceneId) {
    if (!db)
        return null;
    try {
        const stmt = db.prepare('SELECT * FROM scene_prompt_cache WHERE scene_id = ?');
        const row = stmt.get(sceneId);
        if (!row)
            return null;
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
    }
    catch (error) {
        console.error('Error getting scene prompt cache:', error);
        return null;
    }
}
