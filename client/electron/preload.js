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
    },
    // 资源管理
    resources: {
        download: (params) => electron_1.ipcRenderer.invoke('resources:download', params),
        getStatus: (resourceType, resourceId) => electron_1.ipcRenderer.invoke('resources:getStatus', resourceType, resourceId),
        retry: (resourceType, resourceId) => electron_1.ipcRenderer.invoke('resources:retry', resourceType, resourceId),
    },
    // 设置操作
    settings: {
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        save: (key, value) => electron_1.ipcRenderer.invoke('settings:save', key, value),
    },
    // 存储管理
    storage: {
        selectFolder: () => electron_1.ipcRenderer.invoke('dialog:selectFolder'),
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
});
