import { ipcMain } from 'electron';
import { deleteProjectResources } from '../resources/service';
import {
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
} from './service';

export function registerDatabaseHandlers() {
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
}
