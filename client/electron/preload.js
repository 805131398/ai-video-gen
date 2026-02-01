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
