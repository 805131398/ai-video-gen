"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// 暴露安全的 API 给渲染进程
electron_1.contextBridge.exposeInMainWorld('electron', {
    // 数据库操作
    db: {
        getUser: () => electron_1.ipcRenderer.invoke('db:getUser'),
        saveUser: (user) => electron_1.ipcRenderer.invoke('db:saveUser', user),
        saveActivationCode: (code) => electron_1.ipcRenderer.invoke('db:saveActivationCode', code),
        getActivationHistory: () => electron_1.ipcRenderer.invoke('db:getActivationHistory'),
        // 项目管理
        saveProject: (project) => electron_1.ipcRenderer.invoke('db:saveProject', project),
        getProject: (projectId) => electron_1.ipcRenderer.invoke('db:getProject', projectId),
        getProjects: () => electron_1.ipcRenderer.invoke('db:getProjects'),
        deleteProject: (projectId) => electron_1.ipcRenderer.invoke('db:deleteProject', projectId),
        // 角色管理
        saveCharacter: (character) => electron_1.ipcRenderer.invoke('db:saveCharacter', character),
        getProjectCharacters: (projectId) => electron_1.ipcRenderer.invoke('db:getProjectCharacters', projectId),
        getAllCharacters: () => electron_1.ipcRenderer.invoke('db:getAllCharacters'),
        deleteCharacter: (characterId) => electron_1.ipcRenderer.invoke('db:deleteCharacter', characterId),
        // 数字人管理
        saveDigitalHuman: (digitalHuman) => electron_1.ipcRenderer.invoke('db:saveDigitalHuman', digitalHuman),
        getDigitalHumans: (characterId) => electron_1.ipcRenderer.invoke('db:getDigitalHumans', characterId),
        deleteDigitalHuman: (digitalHumanId) => electron_1.ipcRenderer.invoke('db:deleteDigitalHuman', digitalHumanId),
        // 剧本管理
        saveScript: (script) => electron_1.ipcRenderer.invoke('db:saveScript', script),
        getProjectScripts: (projectId) => electron_1.ipcRenderer.invoke('db:getProjectScripts', projectId),
        deleteScript: (scriptId) => electron_1.ipcRenderer.invoke('db:deleteScript', scriptId),
        // 场景管理
        saveScene: (scene) => electron_1.ipcRenderer.invoke('db:saveScene', scene),
        getScriptScenes: (scriptId) => electron_1.ipcRenderer.invoke('db:getScriptScenes', scriptId),
        deleteScene: (sceneId) => electron_1.ipcRenderer.invoke('db:deleteScene', sceneId),
        // 场景视频管理
        saveSceneVideo: (video) => electron_1.ipcRenderer.invoke('db:saveSceneVideo', video),
        getSceneVideos: (sceneId) => electron_1.ipcRenderer.invoke('db:getSceneVideos', sceneId),
        deleteSceneVideo: (videoId) => electron_1.ipcRenderer.invoke('db:deleteSceneVideo', videoId),
        // 生成快照管理
        saveGenerationSnapshot: (snapshot) => electron_1.ipcRenderer.invoke('db:saveGenerationSnapshot', snapshot),
        getGenerationSnapshots: (sceneId) => electron_1.ipcRenderer.invoke('db:getGenerationSnapshots', sceneId),
        // 场景提示词缓存管理
        saveScenePromptCache: (cache) => electron_1.ipcRenderer.invoke('db:saveScenePromptCache', cache),
        getScenePromptCache: (sceneId) => electron_1.ipcRenderer.invoke('db:getScenePromptCache', sceneId),
        // 供应商上传记录管理
        getProviderUploadRecord: (localResourceHash, providerName) => electron_1.ipcRenderer.invoke('db:getProviderUploadRecord', localResourceHash, providerName),
        saveProviderUploadRecord: (record) => electron_1.ipcRenderer.invoke('db:saveProviderUploadRecord', record),
        deleteProviderUploadRecord: (localResourceHash, providerName) => electron_1.ipcRenderer.invoke('db:deleteProviderUploadRecord', localResourceHash, providerName),
        // AI 工具配置管理
        saveAiToolConfig: (config) => electron_1.ipcRenderer.invoke('db:saveAiToolConfig', config),
        getAiToolConfigs: () => electron_1.ipcRenderer.invoke('db:getAiToolConfigs'),
        getAiToolConfigsByType: (toolType) => electron_1.ipcRenderer.invoke('db:getAiToolConfigsByType', toolType),
        getDefaultAiToolConfig: (toolType) => electron_1.ipcRenderer.invoke('db:getDefaultAiToolConfig', toolType),
        setDefaultAiToolConfig: (toolType, configId) => electron_1.ipcRenderer.invoke('db:setDefaultAiToolConfig', toolType, configId),
        deleteAiToolConfig: (configId) => electron_1.ipcRenderer.invoke('db:deleteAiToolConfig', configId),
        // 对话管理
        saveChatConversation: (conversation) => electron_1.ipcRenderer.invoke('db:saveChatConversation', conversation),
        getChatConversations: () => electron_1.ipcRenderer.invoke('db:getChatConversations'),
        deleteChatConversation: (conversationId) => electron_1.ipcRenderer.invoke('db:deleteChatConversation', conversationId),
        updateChatConversationTitle: (conversationId, title) => electron_1.ipcRenderer.invoke('db:updateChatConversationTitle', conversationId, title),
        // 对话消息管理
        saveChatMessage: (message) => electron_1.ipcRenderer.invoke('db:saveChatMessage', message),
        getChatMessages: (conversationId) => electron_1.ipcRenderer.invoke('db:getChatMessages', conversationId),
        deleteChatMessages: (conversationId) => electron_1.ipcRenderer.invoke('db:deleteChatMessages', conversationId),
        // 使用日志管理
        saveAiUsageLog: (log) => electron_1.ipcRenderer.invoke('db:saveAiUsageLog', log),
        getAiUsageLogs: (query) => electron_1.ipcRenderer.invoke('db:getAiUsageLogs', query),
        getUsageStatsSummary: (query) => electron_1.ipcRenderer.invoke('db:getUsageStatsSummary', query),
        getDailyUsageStats: (query) => electron_1.ipcRenderer.invoke('db:getDailyUsageStats', query),
        deleteAiUsageLog: (logId) => electron_1.ipcRenderer.invoke('db:deleteAiUsageLog', logId),
        clearAiUsageLogs: () => electron_1.ipcRenderer.invoke('db:clearAiUsageLogs'),
    },
    // 资源管理
    resources: {
        download: (params) => electron_1.ipcRenderer.invoke('resources:download', params),
        getStatus: (resourceType, resourceId) => electron_1.ipcRenderer.invoke('resources:getStatus', resourceType, resourceId),
        retry: (resourceType, resourceId) => electron_1.ipcRenderer.invoke('resources:retry', resourceType, resourceId),
        getRootPath: () => electron_1.ipcRenderer.invoke('resources:getRootPath'),
        openFolder: () => electron_1.ipcRenderer.invoke('resources:openFolder'),
        readFileInfo: (filePath) => electron_1.ipcRenderer.invoke('resources:readFileInfo', filePath),
    },
    // 设置操作
    settings: {
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        save: (key, value) => electron_1.ipcRenderer.invoke('settings:save', key, value),
    },
    // 存储管理
    storage: {
        selectFolder: () => electron_1.ipcRenderer.invoke('dialog:selectFolder'),
        selectFile: (options) => electron_1.ipcRenderer.invoke('dialog:selectFile', options),
        getDefaultPath: () => electron_1.ipcRenderer.invoke('storage:getDefaultPath'),
        calculateSize: (path) => electron_1.ipcRenderer.invoke('storage:calculateSize', path),
        clearCache: (path) => electron_1.ipcRenderer.invoke('storage:clearCache', path),
    },
    // 应用控制
    app: {
        minimize: () => electron_1.ipcRenderer.send('app:minimize'),
        maximize: () => electron_1.ipcRenderer.send('app:maximize'),
        close: () => electron_1.ipcRenderer.send('app:close'),
    },
    // AI 对话
    chat: {
        sendMessage: (request) => electron_1.ipcRenderer.invoke('chat:sendMessage', request),
        onStreamChunk: (callback) => {
            const handler = (_, chunk) => callback(chunk);
            electron_1.ipcRenderer.on('chat:streamChunk', handler);
            return () => electron_1.ipcRenderer.removeListener('chat:streamChunk', handler);
        },
    },
    // 视频生成
    video: {
        generate: (request) => electron_1.ipcRenderer.invoke('video:generate', request),
        pollStatus: (request) => electron_1.ipcRenderer.invoke('video:pollStatus', request),
        upload: (request) => electron_1.ipcRenderer.invoke('video:upload', request),
    },
});
