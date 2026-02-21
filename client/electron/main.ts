import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import {
  initDatabase,
  getUser,
  saveUser,
  saveActivationCode,
  getActivationHistory,
  getSetting,
  saveSetting,
  // 项目管理
  saveProject,
  getProject,
  getProjects,
  deleteProject,
  // 角色管理
  saveCharacter,
  getProjectCharacters,
  getAllCharacters,
  deleteCharacter,
  // 数字人管理
  saveDigitalHuman,
  getDigitalHumans,
  deleteDigitalHuman,
  // 剧本管理
  saveScript,
  getProjectScripts,
  deleteScript,
  // 场景管理
  saveScene,
  getScriptScenes,
  deleteScene,
  // 场景视频管理
  saveSceneVideo,
  getSceneVideos,
  deleteSceneVideo,
  // 生成快照管理
  saveGenerationSnapshot,
  getGenerationSnapshots,
  // 场景提示词缓存管理
  saveScenePromptCache,
  getScenePromptCache,
  // 资源下载管理
  saveResourceDownload,
  getResourceDownload,
  updateResourceDownload,
  // 供应商上传记录管理
  getProviderUploadRecord,
  saveProviderUploadRecord,
  deleteProviderUploadRecord,
  // AI 工具配置管理
  saveAiToolConfig,
  getAiToolConfigs,
  getAiToolConfigsByType,
  getDefaultAiToolConfig,
  setDefaultAiToolConfig,
  deleteAiToolConfig,
  // 对话管理
  saveChatConversation,
  getChatConversations,
  deleteChatConversation,
  updateChatConversationTitle,
  saveChatMessage,
  getChatMessages,
  deleteChatMessages,
  // 使用日志管理
  saveAiUsageLog,
  getAiUsageLogs,
  getUsageStatsSummary,
  getDailyUsageStats,
  deleteAiUsageLog,
  clearAiUsageLogs,
} from './database';
import { downloadResource, deleteProjectResources } from './resources';

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

  // 项目管理
  ipcMain.handle('db:saveProject', async (_, project: any) => {
    return saveProject(project);
  });

  ipcMain.handle('db:getProject', async (_, projectId: string) => {
    return getProject(projectId);
  });

  ipcMain.handle('db:getProjects', async () => {
    return getProjects();
  });

  ipcMain.handle('db:deleteProject', async (_, projectId: string) => {
    const result = deleteProject(projectId);
    if (result) {
      deleteProjectResources(projectId);
    }
    return result;
  });

  // 角色管理
  ipcMain.handle('db:saveCharacter', async (_, character: any) => {
    return saveCharacter(character);
  });

  ipcMain.handle('db:getProjectCharacters', async (_, projectId: string) => {
    return getProjectCharacters(projectId);
  });

  ipcMain.handle('db:getAllCharacters', async () => {
    return getAllCharacters();
  });

  ipcMain.handle('db:deleteCharacter', async (_, characterId: string) => {
    return deleteCharacter(characterId);
  });

  // 数字人管理
  ipcMain.handle('db:saveDigitalHuman', async (_, digitalHuman: any) => {
    return saveDigitalHuman(digitalHuman);
  });

  ipcMain.handle('db:getDigitalHumans', async (_, characterId: string) => {
    return getDigitalHumans(characterId);
  });

  ipcMain.handle('db:deleteDigitalHuman', async (_, digitalHumanId: string) => {
    return deleteDigitalHuman(digitalHumanId);
  });

  // 剧本管理
  ipcMain.handle('db:saveScript', async (_, script: any) => {
    return saveScript(script);
  });

  ipcMain.handle('db:getProjectScripts', async (_, projectId: string) => {
    return getProjectScripts(projectId);
  });

  ipcMain.handle('db:deleteScript', async (_, scriptId: string) => {
    return deleteScript(scriptId);
  });

  // 场景管理
  ipcMain.handle('db:saveScene', async (_, scene: any) => {
    return saveScene(scene);
  });

  ipcMain.handle('db:getScriptScenes', async (_, scriptId: string) => {
    return getScriptScenes(scriptId);
  });

  ipcMain.handle('db:deleteScene', async (_, sceneId: string) => {
    return deleteScene(sceneId);
  });

  // 场景视频管理
  ipcMain.handle('db:saveSceneVideo', async (_, video: any) => {
    return saveSceneVideo(video);
  });

  ipcMain.handle('db:getSceneVideos', async (_, sceneId: string) => {
    return getSceneVideos(sceneId);
  });

  ipcMain.handle('db:deleteSceneVideo', async (_, videoId: string) => {
    return deleteSceneVideo(videoId);
  });

  // 生成快照管理
  ipcMain.handle('db:saveGenerationSnapshot', async (_, snapshot: any) => {
    return saveGenerationSnapshot(snapshot);
  });

  ipcMain.handle('db:getGenerationSnapshots', async (_, sceneId: string) => {
    return getGenerationSnapshots(sceneId);
  });

  // 场景提示词缓存管理
  ipcMain.handle('db:saveScenePromptCache', async (_, cache: any) => {
    return saveScenePromptCache(cache);
  });

  ipcMain.handle('db:getScenePromptCache', async (_, sceneId: string) => {
    return getScenePromptCache(sceneId);
  });

  // 供应商上传记录管理
  ipcMain.handle('db:getProviderUploadRecord', async (_, localResourceHash: string, providerName: string) => {
    return getProviderUploadRecord(localResourceHash, providerName);
  });

  ipcMain.handle('db:saveProviderUploadRecord', async (_, record: any) => {
    return saveProviderUploadRecord(record);
  });

  ipcMain.handle('db:deleteProviderUploadRecord', async (_, localResourceHash: string, providerName: string) => {
    return deleteProviderUploadRecord(localResourceHash, providerName);
  });

  // AI 工具配置管理
  ipcMain.handle('db:saveAiToolConfig', async (_, config: any) => {
    return saveAiToolConfig(config);
  });

  ipcMain.handle('db:getAiToolConfigs', async () => {
    return getAiToolConfigs();
  });

  ipcMain.handle('db:getAiToolConfigsByType', async (_, toolType: string) => {
    return getAiToolConfigsByType(toolType);
  });

  ipcMain.handle('db:getDefaultAiToolConfig', async (_, toolType: string) => {
    return getDefaultAiToolConfig(toolType);
  });

  ipcMain.handle('db:setDefaultAiToolConfig', async (_, toolType: string, configId: string) => {
    return setDefaultAiToolConfig(toolType, configId);
  });

  ipcMain.handle('db:deleteAiToolConfig', async (_, configId: string) => {
    return deleteAiToolConfig(configId);
  });

  // 对话管理
  ipcMain.handle('db:saveChatConversation', async (_, conversation: any) => {
    return saveChatConversation(conversation);
  });

  ipcMain.handle('db:getChatConversations', async () => {
    return getChatConversations();
  });

  ipcMain.handle('db:deleteChatConversation', async (_, conversationId: string) => {
    return deleteChatConversation(conversationId);
  });

  ipcMain.handle('db:updateChatConversationTitle', async (_, conversationId: string, title: string) => {
    return updateChatConversationTitle(conversationId, title);
  });

  ipcMain.handle('db:saveChatMessage', async (_, message: any) => {
    return saveChatMessage(message);
  });

  ipcMain.handle('db:getChatMessages', async (_, conversationId: string) => {
    return getChatMessages(conversationId);
  });

  ipcMain.handle('db:deleteChatMessages', async (_, conversationId: string) => {
    return deleteChatMessages(conversationId);
  });

  // 使用日志管理
  ipcMain.handle('db:saveAiUsageLog', async (_, log: any) => {
    return saveAiUsageLog(log);
  });

  ipcMain.handle('db:getAiUsageLogs', async (_, query: any) => {
    return getAiUsageLogs(query);
  });

  ipcMain.handle('db:getUsageStatsSummary', async (_, query: any) => {
    return getUsageStatsSummary(query);
  });

  ipcMain.handle('db:getDailyUsageStats', async (_, query: any) => {
    return getDailyUsageStats(query);
  });

  ipcMain.handle('db:deleteAiUsageLog', async (_, logId: string) => {
    return deleteAiUsageLog(logId);
  });

  ipcMain.handle('db:clearAiUsageLogs', async () => {
    return clearAiUsageLogs();
  });

  // AI 对话流式调用
  ipcMain.handle('chat:sendMessage', async (event, request: any) => {
    const startTime = Date.now();
    const logId = crypto.randomUUID();
    const { baseUrl, apiKey, model, messages, temperature, maxTokens, conversationId, modelConfigId, toolType } = request;

    let url = baseUrl.replace(/\/+$/, '');
    // 去除已知路径后缀，避免重复拼接
    const knownSuffixes = ['/chat/completions', '/completions', '/images/generations', '/embeddings', '/audio'];
    for (const suffix of knownSuffixes) {
      if (url.endsWith(suffix)) {
        url = url.slice(0, -suffix.length);
        break;
      }
    }
    url = `${url}/chat/completions`;

    const body: any = {
      model,
      messages,
      stream: true,
    };
    if (temperature !== undefined) body.temperature = temperature;
    if (maxTokens !== undefined) body.max_tokens = maxTokens;

    // 用户输入摘要（取最后一条 user 消息）
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userInput = lastUserMsg?.content?.slice(0, 500) || '';

    // 请求体快照（隐藏 apiKey）
    const requestBodySnapshot = JSON.stringify({ url, model, messages, temperature, maxTokens });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const durationMs = Date.now() - startTime;
        mainWindow?.webContents.send('chat:streamChunk', {
          type: 'error',
          error: `HTTP ${response.status}: ${errorText}`,
        });
        // 记录错误日志
        saveAiUsageLog({
          id: logId, toolType: toolType || 'text_chat', modelName: model,
          modelConfigId: modelConfigId || null, status: 'error',
          errorMessage: `HTTP ${response.status}: ${errorText.slice(0, 2000)}`,
          durationMs, requestBody: requestBodySnapshot,
          responseBody: errorText.slice(0, 5000),
          userInput, baseUrl, temperature, maxTokens,
          conversationId: conversationId || null,
          createdAt: new Date().toISOString(),
        });
        return '';
      }

      const reader = response.body?.getReader();
      if (!reader) {
        mainWindow?.webContents.send('chat:streamChunk', { type: 'error', error: '无法读取响应流' });
        saveAiUsageLog({
          id: logId, toolType: toolType || 'text_chat', modelName: model,
          modelConfigId: modelConfigId || null, status: 'error',
          errorMessage: '无法读取响应流', durationMs: Date.now() - startTime,
          requestBody: requestBodySnapshot, userInput, baseUrl, temperature, maxTokens,
          conversationId: conversationId || null, createdAt: new Date().toISOString(),
        });
        return '';
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      let usageInfo: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              mainWindow?.webContents.send('chat:streamChunk', { type: 'delta', content });
            }
            // 提取 usage 信息（部分 API 在最后一个 chunk 返回）
            if (json.usage) {
              usageInfo = json.usage;
            }
          } catch { /* ignore parse errors */ }
        }
      }

      const durationMs = Date.now() - startTime;
      mainWindow?.webContents.send('chat:streamChunk', { type: 'done' });

      // 记录成功日志
      saveAiUsageLog({
        id: logId, toolType: toolType || 'text_chat', modelName: model,
        modelConfigId: modelConfigId || null, status: 'success',
        durationMs,
        promptTokens: usageInfo?.prompt_tokens || null,
        completionTokens: usageInfo?.completion_tokens || null,
        totalTokens: usageInfo?.total_tokens || null,
        requestBody: requestBodySnapshot,
        responseBody: fullContent.slice(0, 10000),
        userInput, aiOutput: fullContent.slice(0, 500),
        baseUrl, temperature, maxTokens,
        conversationId: conversationId || null,
        createdAt: new Date().toISOString(),
      });

      return fullContent;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      mainWindow?.webContents.send('chat:streamChunk', {
        type: 'error',
        error: error.message || '请求失败',
      });
      // 记录异常日志
      saveAiUsageLog({
        id: logId, toolType: toolType || 'text_chat', modelName: model,
        modelConfigId: modelConfigId || null, status: 'error',
        errorMessage: error.message || '请求失败', durationMs,
        requestBody: requestBodySnapshot, userInput,
        baseUrl, temperature, maxTokens,
        conversationId: conversationId || null,
        createdAt: new Date().toISOString(),
      });
      return '';
    }
  });

  // ==================== 视频生成相关 IPC ====================

  // 从嵌套对象中按点号路径取值
  function getByPath(obj: any, dotPath: string): any {
    // 支持 data[0].url 和 data.0.url 两种数组索引写法
    const keys = dotPath.replace(/\[(\d+)\]/g, '.$1').split('.');
    return keys.reduce((o, k) => o?.[k], obj);
  }

  // 将点号路径的 key 设置到嵌套对象中
  function setByPath(obj: any, dotPath: string, value: any): void {
    const keys = dotPath.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  // 视频生成 — 提交任务
  ipcMain.handle('video:generate', async (_event, request: any) => {
    const { baseUrl, apiKey, generateConfig, prompt, imageUrl, paramValues,
            conversationId, modelConfigId, modelName } = request;
    const logId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const body: any = {};
      body.prompt = prompt;
      if (imageUrl) body.image_url = imageUrl;

      for (const param of generateConfig.params) {
        if (param.type === 'file') continue;
        const value = paramValues[param.key] !== undefined ? paramValues[param.key] : param.value;
        setByPath(body, param.key, value);
      }

      const url = baseUrl.replace(/\/+$/, '') + generateConfig.path;
      const response = await fetch(url, {
        method: generateConfig.method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let responseJson: any;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

      if (!response.ok) {
        saveAiUsageLog({
          id: logId, toolType: 'video_gen', modelName: modelName || null,
          modelConfigId: modelConfigId || null, status: 'error',
          errorMessage: `HTTP ${response.status}: ${responseText.slice(0, 2000)}`,
          durationMs: Date.now() - startTime,
          requestBody: JSON.stringify({ url, body }),
          responseBody: responseText.slice(0, 5000),
          userInput: prompt.slice(0, 500), baseUrl,
          conversationId: conversationId || null,
          createdAt: new Date().toISOString(),
        });
        return { success: false, error: `HTTP ${response.status}: ${responseText.slice(0, 500)}` };
      }

      let taskId: string | undefined;
      for (const mapping of generateConfig.responseMapping) {
        if (mapping.key === 'taskId' && responseJson) {
          taskId = String(getByPath(responseJson, mapping.path));
        }
      }

      saveAiUsageLog({
        id: logId, toolType: 'video_gen', modelName: modelName || null,
        modelConfigId: modelConfigId || null, status: 'success',
        durationMs: Date.now() - startTime,
        requestBody: JSON.stringify({ url, body }),
        responseBody: responseText.slice(0, 5000),
        userInput: prompt.slice(0, 500), aiOutput: taskId || '',
        baseUrl, conversationId: conversationId || null,
        createdAt: new Date().toISOString(),
      });

      return { success: true, taskId, rawResponse: responseJson };
    } catch (error: any) {
      saveAiUsageLog({
        id: logId, toolType: 'video_gen', modelName: modelName || null,
        modelConfigId: modelConfigId || null, status: 'error',
        errorMessage: error.message, durationMs: Date.now() - startTime,
        requestBody: JSON.stringify({ prompt, paramValues }),
        userInput: prompt.slice(0, 500), baseUrl,
        conversationId: conversationId || null,
        createdAt: new Date().toISOString(),
      });
      return { success: false, error: error.message };
    }
  });

  // 视频生成 — 轮询任务状态
  ipcMain.handle('video:pollStatus', async (_event, request: any) => {
    const { baseUrl, apiKey, statusConfig, taskId, conversationId, modelConfigId, modelName } = request;

    try {
      const statusPath = statusConfig.path.replace('{taskId}', taskId);
      const url = baseUrl.replace(/\/+$/, '') + statusPath;

      console.log(`[video:pollStatus] taskId=${taskId}, url=${url}`);

      const response = await fetch(url, {
        method: statusConfig.method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();
      let responseJson: any;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

      console.log(`[video:pollStatus] taskId=${taskId}, HTTP ${response.status}, body=${responseText.slice(0, 1000)}`);

      if (!response.ok) {
        const errorMsg = `HTTP ${response.status}: ${responseText.slice(0, 500)}`;
        console.error(`[video:pollStatus] 请求失败: ${errorMsg}`);
        saveAiUsageLog({
          id: crypto.randomUUID(), toolType: 'video_gen', modelName: modelName || null,
          modelConfigId: modelConfigId || null, status: 'error',
          errorMessage: errorMsg,
          requestBody: JSON.stringify({ url, taskId }),
          responseBody: responseText.slice(0, 5000),
          userInput: `poll:${taskId}`, baseUrl,
          conversationId: conversationId || null,
          extraData: JSON.stringify({ stage: 'poll_status', httpStatus: response.status }),
          createdAt: new Date().toISOString(),
        });
        return { success: false, error: errorMsg };
      }

      const result: any = { success: true, rawResponse: responseJson };
      for (const mapping of statusConfig.responseMapping) {
        if (responseJson) {
          const resolved = getByPath(responseJson, mapping.path);
          console.log(`[video:pollStatus] mapping: key="${mapping.key}", path="${mapping.path}" → ${JSON.stringify(resolved)}`);
          result[mapping.key] = resolved;
        }
      }

      console.log(`[video:pollStatus] taskId=${taskId}, mapped result: status=${result.status}, videoUrl=${result.videoUrl || 'N/A'}`);

      // 记录终态日志（完成或失败）
      const mappedStatus = (result.status || '').toLowerCase();
      const isTerminal = ['completed', 'complete', 'succeeded', 'success', 'failed', 'error', 'cancelled'].some(
        s => mappedStatus.includes(s)
      );
      if (isTerminal) {
        const isSuccess = ['completed', 'complete', 'succeeded', 'success'].some(s => mappedStatus.includes(s));
        saveAiUsageLog({
          id: crypto.randomUUID(), toolType: 'video_gen', modelName: modelName || null,
          modelConfigId: modelConfigId || null, status: isSuccess ? 'success' : 'error',
          errorMessage: isSuccess ? null : `任务终态: ${result.status}`,
          requestBody: JSON.stringify({ url, taskId }),
          responseBody: responseText.slice(0, 5000),
          userInput: `poll:${taskId}`,
          aiOutput: result.videoUrl || '',
          baseUrl, conversationId: conversationId || null,
          extraData: JSON.stringify({ stage: 'poll_terminal', mappedStatus: result.status, videoUrl: result.videoUrl, thumbnailUrl: result.thumbnailUrl }),
          createdAt: new Date().toISOString(),
        });
      }

      return result;
    } catch (error: any) {
      console.error(`[video:pollStatus] 异常: taskId=${taskId}, error=${error.message}`);
      saveAiUsageLog({
        id: crypto.randomUUID(), toolType: 'video_gen', modelName: modelName || null,
        modelConfigId: modelConfigId || null, status: 'error',
        errorMessage: error.message,
        requestBody: JSON.stringify({ taskId }),
        userInput: `poll:${taskId}`, baseUrl,
        conversationId: conversationId || null,
        extraData: JSON.stringify({ stage: 'poll_exception' }),
        createdAt: new Date().toISOString(),
      });
      return { success: false, error: error.message };
    }
  });

  // 视频生成 — 上传图片
  ipcMain.handle('video:upload', async (_event, request: any) => {
    const { baseUrl, apiKey, uploadConfig, filePath } = request;

    try {
      const url = baseUrl.replace(/\/+$/, '') + uploadConfig.path;
      const fileParam = uploadConfig.params.find((p: any) => p.type === 'file');
      const fieldName = fileParam?.key || 'file';

      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append(fieldName, blob, fileName);

      const response = await fetch(url, {
        method: uploadConfig.method,
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: formData,
      });

      const responseText = await response.text();
      let responseJson: any;
      try { responseJson = JSON.parse(responseText); } catch { responseJson = null; }

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${responseText.slice(0, 500)}` };
      }

      let imageUrl: string | undefined;
      for (const mapping of uploadConfig.responseMapping) {
        if (mapping.key === 'imageUrl' && responseJson) {
          imageUrl = String(getByPath(responseJson, mapping.path));
        }
      }
      return { success: true, imageUrl };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // 资源下载管理
  ipcMain.handle('resources:download', async (_, params: any) => {
    return await downloadResource(params);
  });

  ipcMain.handle('resources:getStatus', async (_, resourceType: string, resourceId: string) => {
    const download = getResourceDownload(resourceType, resourceId);
    if (!download) return null;

    return {
      status: download.status,
      progress:
        download.fileSize && download.downloadedSize
          ? Math.round((download.downloadedSize / download.fileSize) * 100)
          : 0,
      localPath: download.localPath,
      error: download.errorMessage,
    };
  });

  ipcMain.handle('resources:retry', async (_, resourceType: string, resourceId: string) => {
    const download = getResourceDownload(resourceType, resourceId);
    if (!download) return { success: false, error: 'Download record not found' };

    updateResourceDownload(resourceType, resourceId, {
      status: 'pending',
      errorMessage: null,
    });

    return { success: true };
  });

  // 获取资源根目录路径
  ipcMain.handle('resources:getRootPath', async () => {
    const userDataPath = app.getPath('userData');
    const resourcesRoot = path.join(userDataPath, 'resources');
    return {
      userDataPath,
      resourcesRoot,
    };
  });

  // 打开资源文件夹
  ipcMain.handle('resources:openFolder', async () => {
    const { getSetting } = await import('./database');

    // 尝试从设置中读取路径配置
    const pathType = getSetting('storage_path_type');
    const customPath = getSetting('storage_custom_path');

    // 确定实际路径
    let resourcesRoot: string;
    if (pathType === 'custom' && customPath) {
      resourcesRoot = customPath;
    } else {
      resourcesRoot = path.join(app.getPath('userData'), 'resources');
    }

    // 确保目录存在
    if (!fsSync.existsSync(resourcesRoot)) {
      await fs.mkdir(resourcesRoot, { recursive: true });
    }

    // 打开文件夹
    await shell.openPath(resourcesRoot);

    return { success: true, path: resourcesRoot };
  });

  // 设置操作
  ipcMain.handle('settings:get', async (_, key: string) => {
    return getSetting(key);
  });

  ipcMain.handle('settings:save', async (_, key: string, value: string) => {
    return saveSetting(key, value);
  });

  // 存储管理 - 选择文件（图片）
  ipcMain.handle('dialog:selectFile', async (_, options?: { filters?: { name: string; extensions: string[] }[]; title?: string }) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: options?.title || '选择文件',
      filters: options?.filters || [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  // 存储管理 - 选择文件夹
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '选择保存位置'
    });
    return result.canceled ? undefined : result.filePaths[0];
  });

  // 存储管理 - 获取默认路径
  ipcMain.handle('storage:getDefaultPath', () => {
    return path.join(app.getPath('userData'), 'media');
  });

  // 存储管理 - 计算文件夹大小
  ipcMain.handle('storage:calculateSize', async (_, folderPath: string) => {
    try {
      let totalBytes = 0;
      let fileCount = 0;

      const calculateDir = async (dirPath: string) => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            try {
              if (entry.isDirectory()) {
                await calculateDir(fullPath);
              } else {
                const stats = await fs.stat(fullPath);
                totalBytes += stats.size;
                fileCount++;
              }
            } catch (err) {
              // 跳过无法访问的文件
              console.warn(`Skip file: ${fullPath}`, err);
            }
          }
        } catch (err) {
          // 目录不存在或无权限
          console.warn(`Cannot read directory: ${dirPath}`, err);
        }
      }

      await calculateDir(folderPath);
      return { bytes: totalBytes, count: fileCount };
    } catch (error) {
      console.error('Calculate size error:', error);
      return { bytes: 0, count: 0 };
    }
  });

  // 存储管理 - 清理缓存
  ipcMain.handle('storage:clearCache', async (_, folderPath: string) => {
    try {
      let deletedCount = 0;

      const clearDir = async (dirPath: string) => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            try {
              if (entry.isDirectory()) {
                await clearDir(fullPath);
                await fs.rmdir(fullPath);
              } else {
                await fs.unlink(fullPath);
                deletedCount++;
              }
            } catch (err) {
              // 跳过正在使用的文件
              console.warn(`Skip file: ${fullPath}`, err);
            }
          }
        } catch (err) {
          console.warn(`Cannot clear directory: ${dirPath}`, err);
        }
      }

      await clearDir(folderPath);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Clear cache error:', error);
      return { success: false, deletedCount: 0 };
    }
  });

  // 文件读取 + 哈希计算（供应商上传用）
  ipcMain.handle('resources:readFileInfo', async (_, filePath: string) => {
    try {
      const buffer = fsSync.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
      };
      return {
        success: true,
        base64: buffer.toString('base64'),
        hash,
        size: buffer.length,
        mimeType: mimeMap[ext] || 'application/octet-stream',
        fileName: path.basename(filePath),
      };
    } catch (error: any) {
      console.error('Error reading file info:', error);
      return { success: false, error: error.message };
    }
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
