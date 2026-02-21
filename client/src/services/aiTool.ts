import { AiToolConfig, AiToolType } from '../types';

// 获取所有 AI 工具配置
export async function getAiToolConfigs(): Promise<AiToolConfig[]> {
    if (window.electron?.db) {
        return await window.electron.db.getAiToolConfigs();
    }
    return [];
}

// 按类型获取 AI 工具配置
export async function getAiToolConfigsByType(toolType: AiToolType): Promise<AiToolConfig[]> {
    if (window.electron?.db) {
        return await window.electron.db.getAiToolConfigsByType(toolType);
    }
    return [];
}

// 获取某类型的默认配置
export async function getDefaultAiToolConfig(toolType: AiToolType): Promise<AiToolConfig | null> {
    if (window.electron?.db) {
        return await window.electron.db.getDefaultAiToolConfig(toolType);
    }
    return null;
}

// 保存（新建或更新）AI 工具配置
export async function saveAiToolConfig(config: AiToolConfig): Promise<boolean> {
    if (window.electron?.db) {
        return await window.electron.db.saveAiToolConfig(config);
    }
    return false;
}

// 设置默认
export async function setDefaultAiToolConfig(toolType: AiToolType, configId: string): Promise<boolean> {
    if (window.electron?.db) {
        return await window.electron.db.setDefaultAiToolConfig(toolType, configId);
    }
    return false;
}

// 删除
export async function deleteAiToolConfig(configId: string): Promise<boolean> {
    if (window.electron?.db) {
        return await window.electron.db.deleteAiToolConfig(configId);
    }
    return false;
}
