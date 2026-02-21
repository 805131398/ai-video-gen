
import {
  Project,
  ProjectCharacter,
  CreateProjectRequest,
  CreateCharacterRequest,
  GenerateCharactersRequest,
  GenerateCharactersResponse,
  DigitalHuman,
} from '../types';
import api from './api';

// 创建项目
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    userId: '',
    topic: data.topic || '',
    title: data.title || null,
    status: 'DRAFT',
    currentStep: 'TOPIC_INPUT',
    themeName: data.themeName || null,
    themeDesc: data.themeDesc || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (window.electron?.db) {
    await window.electron.db.saveProject(project);
  }
  return project;
}

// 获取项目详情
export async function getProject(id: string): Promise<Project> {
  if (window.electron?.db) {
    const project = await window.electron.db.getProject(id);
    if (project) {
      // 加载角色数据
      const characters = await window.electron.db.getProjectCharacters(id);
      for (const character of characters) {
        character.digitalHumans = await window.electron.db.getDigitalHumans(character.id);
      }
      project.characters = characters;
      return project;
    }
  }
  throw new Error('Project not found');
}

// 获取项目列表
export async function getProjects(): Promise<Project[]> {
  if (window.electron?.db) {
    return await window.electron.db.getProjects();
  }
  return [];
}

// 更新项目
export async function updateProject(id: string, data: Partial<CreateProjectRequest>): Promise<Project> {
  const existing = await getProject(id);
  const updated: Project = { ...existing, ...data, updatedAt: new Date().toISOString() };
  if (window.electron?.db) {
    await window.electron.db.saveProject(updated);
  }
  return updated;
}

// 删除项目
export async function deleteProject(id: string): Promise<void> {
  if (window.electron?.db) {
    await window.electron.db.deleteProject(id);
  }
}

// 获取项目角色列表
export async function getProjectCharacters(projectId: string): Promise<ProjectCharacter[]> {
  if (window.electron?.db) {
    return await window.electron.db.getProjectCharacters(projectId);
  }
  return [];
}

// 创建角色
export async function createCharacter(
  projectId: string,
  data: CreateCharacterRequest
): Promise<ProjectCharacter> {
  const character: ProjectCharacter = {
    id: crypto.randomUUID(),
    projectId,
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

// 更新角色
export async function updateCharacter(
  projectId: string,
  characterId: string,
  data: Partial<CreateCharacterRequest>
): Promise<ProjectCharacter> {
  if (!window.electron?.db) throw new Error('Database not available');
  const existing = await window.electron.db.getProjectCharacters(projectId);
  const character = existing.find(c => c.id === characterId);
  if (!character) throw new Error('Character not found');

  const updated: ProjectCharacter = { ...character, ...data, updatedAt: new Date().toISOString() };
  await window.electron.db.saveCharacter(updated);
  return updated;
}

// 删除角色
export async function deleteCharacter(_projectId: string, characterId: string): Promise<void> {
  if (window.electron?.db) {
    await window.electron.db.deleteCharacter(characterId);
  }
}

// 这三个因为用到了 AI, 可能是全局的接口调用
export async function generateCharacters(
  _projectId: string,
  data: GenerateCharactersRequest
): Promise<GenerateCharactersResponse> {
  const response = await api.post(`/api/characters/generate`, data); // Note: Need to adjust endpoint in reality
  return response.data;
}

export async function generateCharacterDescription(
  _projectId: string,
  characterName: string
): Promise<string> {
  const response = await api.post(`/api/characters/generate-description`, { characterName });
  return response.data.description;
}

// 获取数字人列表
export async function getDigitalHumans(
  _projectId: string,
  characterId: string,
  _forceRemote: boolean = false
): Promise<DigitalHuman[]> {
  if (window.electron?.db) {
    return await window.electron.db.getDigitalHumans(characterId);
  }
  return [];
}

// 生成数字人（异步）
export async function generateDigitalHumans(
  _projectId: string,
  characterId: string,
  count: number = 1,
  size?: string
): Promise<{ batchId: string; status: string; message: string }> {
  // 调用无状态 API
  const response = await api.post(
    `/characters/${characterId}/digital-humans/generate`,
    { count, size }
  );
  return response.data;
}

// 选择数字人
export async function selectDigitalHuman(
  _projectId: string,
  characterId: string,
  humanId: string
): Promise<DigitalHuman> {
  if (!window.electron?.db) throw new Error('Database not available');
  const humans = await window.electron.db.getDigitalHumans(characterId);
  for (const human of humans) {
    human.isSelected = human.id === humanId;
    await window.electron.db.saveDigitalHuman(human);
  }
  const selected = humans.find(h => h.id === humanId);
  return selected as DigitalHuman;
}
