import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 数据库操作
  db: {
    getUser: () => ipcRenderer.invoke('db:getUser'),
    saveUser: (user: any) => ipcRenderer.invoke('db:saveUser', user),
    saveActivationCode: (code: any) => ipcRenderer.invoke('db:saveActivationCode', code),
    getActivationHistory: () => ipcRenderer.invoke('db:getActivationHistory'),
    // 项目管理
    saveProject: (project: any) => ipcRenderer.invoke('db:saveProject', project),
    getProject: (projectId: string) => ipcRenderer.invoke('db:getProject', projectId),
    getProjects: () => ipcRenderer.invoke('db:getProjects'),
    deleteProject: (projectId: string) => ipcRenderer.invoke('db:deleteProject', projectId),
    // 角色管理
    saveCharacter: (character: any) => ipcRenderer.invoke('db:saveCharacter', character),
    getProjectCharacters: (projectId: string) => ipcRenderer.invoke('db:getProjectCharacters', projectId),
    getAllCharacters: () => ipcRenderer.invoke('db:getAllCharacters'),
    deleteCharacter: (characterId: string) => ipcRenderer.invoke('db:deleteCharacter', characterId),
    // 数字人管理
    saveDigitalHuman: (digitalHuman: any) => ipcRenderer.invoke('db:saveDigitalHuman', digitalHuman),
    getDigitalHumans: (characterId: string) => ipcRenderer.invoke('db:getDigitalHumans', characterId),
    deleteDigitalHuman: (digitalHumanId: string) => ipcRenderer.invoke('db:deleteDigitalHuman', digitalHumanId),
    // 剧本管理
    saveScript: (script: any) => ipcRenderer.invoke('db:saveScript', script),
    getProjectScripts: (projectId: string) => ipcRenderer.invoke('db:getProjectScripts', projectId),
    deleteScript: (scriptId: string) => ipcRenderer.invoke('db:deleteScript', scriptId),
    // 场景管理
    saveScene: (scene: any) => ipcRenderer.invoke('db:saveScene', scene),
    getScriptScenes: (scriptId: string) => ipcRenderer.invoke('db:getScriptScenes', scriptId),
    deleteScene: (sceneId: string) => ipcRenderer.invoke('db:deleteScene', sceneId),
    // 场景视频管理
    saveSceneVideo: (video: any) => ipcRenderer.invoke('db:saveSceneVideo', video),
    getSceneVideos: (sceneId: string) => ipcRenderer.invoke('db:getSceneVideos', sceneId),
    deleteSceneVideo: (videoId: string) => ipcRenderer.invoke('db:deleteSceneVideo', videoId),
    // 生成快照管理
    saveGenerationSnapshot: (snapshot: any) => ipcRenderer.invoke('db:saveGenerationSnapshot', snapshot),
    getGenerationSnapshots: (sceneId: string) => ipcRenderer.invoke('db:getGenerationSnapshots', sceneId),
    // 场景提示词缓存管理
    saveScenePromptCache: (cache: any) => ipcRenderer.invoke('db:saveScenePromptCache', cache),
    getScenePromptCache: (sceneId: string) => ipcRenderer.invoke('db:getScenePromptCache', sceneId),
    // 供应商上传记录管理
    getProviderUploadRecord: (localResourceHash: string, providerName: string) =>
      ipcRenderer.invoke('db:getProviderUploadRecord', localResourceHash, providerName),
    saveProviderUploadRecord: (record: any) =>
      ipcRenderer.invoke('db:saveProviderUploadRecord', record),
    deleteProviderUploadRecord: (localResourceHash: string, providerName: string) =>
      ipcRenderer.invoke('db:deleteProviderUploadRecord', localResourceHash, providerName),
    // AI 工具配置管理
    saveAiToolConfig: (config: any) => ipcRenderer.invoke('db:saveAiToolConfig', config),
    getAiToolConfigs: () => ipcRenderer.invoke('db:getAiToolConfigs'),
    getAiToolConfigsByType: (toolType: string) => ipcRenderer.invoke('db:getAiToolConfigsByType', toolType),
    getDefaultAiToolConfig: (toolType: string) => ipcRenderer.invoke('db:getDefaultAiToolConfig', toolType),
    setDefaultAiToolConfig: (toolType: string, configId: string) =>
      ipcRenderer.invoke('db:setDefaultAiToolConfig', toolType, configId),
    deleteAiToolConfig: (configId: string) => ipcRenderer.invoke('db:deleteAiToolConfig', configId),
    // 对话管理
    saveChatConversation: (conversation: any) => ipcRenderer.invoke('db:saveChatConversation', conversation),
    getChatConversations: () => ipcRenderer.invoke('db:getChatConversations'),
    deleteChatConversation: (conversationId: string) => ipcRenderer.invoke('db:deleteChatConversation', conversationId),
    updateChatConversationTitle: (conversationId: string, title: string) =>
      ipcRenderer.invoke('db:updateChatConversationTitle', conversationId, title),
    // 对话消息管理
    saveChatMessage: (message: any) => ipcRenderer.invoke('db:saveChatMessage', message),
    getChatMessages: (conversationId: string) => ipcRenderer.invoke('db:getChatMessages', conversationId),
    deleteChatMessages: (conversationId: string) => ipcRenderer.invoke('db:deleteChatMessages', conversationId),
    // 使用日志管理
    saveAiUsageLog: (log: any) => ipcRenderer.invoke('db:saveAiUsageLog', log),
    getAiUsageLogs: (query: any) => ipcRenderer.invoke('db:getAiUsageLogs', query),
    getUsageStatsSummary: (query: any) => ipcRenderer.invoke('db:getUsageStatsSummary', query),
    getDailyUsageStats: (query: any) => ipcRenderer.invoke('db:getDailyUsageStats', query),
    deleteAiUsageLog: (logId: string) => ipcRenderer.invoke('db:deleteAiUsageLog', logId),
    clearAiUsageLogs: () => ipcRenderer.invoke('db:clearAiUsageLogs'),
  },
  // 资源管理
  resources: {
    download: (params: any) => ipcRenderer.invoke('resources:download', params),
    getStatus: (resourceType: string, resourceId: string) =>
      ipcRenderer.invoke('resources:getStatus', resourceType, resourceId),
    retry: (resourceType: string, resourceId: string) =>
      ipcRenderer.invoke('resources:retry', resourceType, resourceId),
    getRootPath: () => ipcRenderer.invoke('resources:getRootPath'),
    openFolder: () => ipcRenderer.invoke('resources:openFolder'),
    readFileInfo: (filePath: string) => ipcRenderer.invoke('resources:readFileInfo', filePath),
  },
  // 设置操作
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    save: (key: string, value: string) => ipcRenderer.invoke('settings:save', key, value),
  },
  // 存储管理
  storage: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    selectFile: (options?: { filters?: { name: string; extensions: string[] }[]; title?: string }) => ipcRenderer.invoke('dialog:selectFile', options),
    getDefaultPath: () => ipcRenderer.invoke('storage:getDefaultPath'),
    calculateSize: (path: string) => ipcRenderer.invoke('storage:calculateSize', path),
    clearCache: (path: string) => ipcRenderer.invoke('storage:clearCache', path),
  },
  // 应用控制
  app: {
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    close: () => ipcRenderer.send('app:close'),
  },
  // AI 对话
  chat: {
    sendMessage: (request: any) => ipcRenderer.invoke('chat:sendMessage', request),
    onStreamChunk: (callback: (chunk: any) => void) => {
      const handler = (_: any, chunk: any) => callback(chunk);
      ipcRenderer.on('chat:streamChunk', handler);
      return () => ipcRenderer.removeListener('chat:streamChunk', handler);
    },
  },
  // 视频生成
  video: {
    generate: (request: any) => ipcRenderer.invoke('video:generate', request),
    pollStatus: (request: any) => ipcRenderer.invoke('video:pollStatus', request),
    upload: (request: any) => ipcRenderer.invoke('video:upload', request),
  },
});
