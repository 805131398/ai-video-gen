import { ProjectCharacter, CreateCharacterRequest } from '../types';
import api from './api';

// 获取所有角色
export async function getCharacters(): Promise<ProjectCharacter[]> {
    if (window.electron?.db) {
        return await window.electron.db.getAllCharacters();
    }
    return [];
}

// 创建独立角色
export async function createCharacter(
    data: CreateCharacterRequest & { projectId?: string }
): Promise<ProjectCharacter> {
    const character: ProjectCharacter = {
        id: crypto.randomUUID(),
        projectId: data.projectId || null,
        name: data.name,
        description: data.description,
        attributes: data.attributes || {},
        avatarUrl: data.avatarUrl,
        sortOrder: data.sortOrder || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    if (window.electron?.db) {
        await window.electron.db.saveCharacter(character);
    }
    return character;
}

// 获取单个角色
export async function getCharacter(id: string): Promise<ProjectCharacter> {
    if (window.electron?.db) {
        const chars = await window.electron.db.getAllCharacters();
        const character = chars.find(c => c.id === id);
        if (character) return character;
    }
    throw new Error('Character not found');
}

// 更新角色
export async function updateCharacter(
    id: string,
    data: Partial<CreateCharacterRequest> & { projectId?: string }
): Promise<ProjectCharacter> {
    const character = await getCharacter(id);
    const updated: ProjectCharacter = { ...character, ...data, updatedAt: new Date().toISOString() };
    if (window.electron?.db) {
        await window.electron.db.saveCharacter(updated);
    }
    return updated;
}

// 删除角色
export async function deleteCharacter(id: string): Promise<void> {
    if (window.electron?.db) {
        await window.electron.db.deleteCharacter(id);
    }
}

// 获取数字人列表
export async function getDigitalHumans(characterId: string, _forceRemote: boolean = false): Promise<any[]> {
    if (window.electron?.db) {
        return await window.electron.db.getDigitalHumans(characterId);
    }
    return [];
}

// 生成数字人
export async function generateDigitalHumans(
    characterId: string,
    count: number = 1,
    size?: string
): Promise<{ batchId: string; status: string; message: string }> {
    // 这部分调用 API 保持，但是后端重构成无状态直接返回 URL 或任务 ID。
    const response = await api.post(`/characters/${characterId}/digital-humans/generate`, { count, size });
    return response.data;
}

// 选择数字人
export async function selectDigitalHuman(characterId: string, humanId: string): Promise<any> {
    if (!window.electron?.db) throw new Error('Database not available');
    const humans = await window.electron.db.getDigitalHumans(characterId);
    let selected;
    for (const human of humans) {
        human.isSelected = human.id === humanId;
        await window.electron.db.saveDigitalHuman(human);
        if (human.id === humanId) selected = human;
    }
    return selected;
}
