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
  },
  // 设置操作
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    save: (key: string, value: string) => ipcRenderer.invoke('settings:save', key, value),
  },
  // 存储管理
  storage: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
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
});
