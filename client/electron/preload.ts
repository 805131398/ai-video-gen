import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 数据库操作
  db: {
    getUser: () => ipcRenderer.invoke('db:getUser'),
    saveUser: (user: any) => ipcRenderer.invoke('db:saveUser', user),
    saveActivationCode: (code: any) => ipcRenderer.invoke('db:saveActivationCode', code),
    getActivationHistory: () => ipcRenderer.invoke('db:getActivationHistory'),
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
