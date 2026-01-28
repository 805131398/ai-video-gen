import api from './api';
import {
  Project,
  ProjectCharacter,
  CreateProjectRequest,
  CreateCharacterRequest,
  GenerateCharactersRequest,
  GenerateCharactersResponse,
  DigitalHuman,
} from '../types';

// 创建项目
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await api.post('/projects', data);
  return response.data;
}

// 获取项目详情
export async function getProject(id: string): Promise<Project> {
  const response = await api.get(`/projects/${id}`);
  return response.data;
}

// 获取项目列表
export async function getProjects(): Promise<Project[]> {
  const response = await api.get('/projects');
  return response.data.data || [];
}

// 更新项目
export async function updateProject(id: string, data: Partial<CreateProjectRequest>): Promise<Project> {
  const response = await api.put(`/projects/${id}`, data);
  return response.data;
}

// 删除项目
export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);
}

// 获取项目角色列表
export async function getProjectCharacters(projectId: string): Promise<ProjectCharacter[]> {
  const response = await api.get(`/projects/${projectId}/characters`);
  return response.data.data || [];
}

// 创建角色
export async function createCharacter(
  projectId: string,
  data: CreateCharacterRequest
): Promise<ProjectCharacter> {
  const response = await api.post(`/projects/${projectId}/characters`, data);
  return response.data;
}

// 更新角色
export async function updateCharacter(
  projectId: string,
  characterId: string,
  data: Partial<CreateCharacterRequest>
): Promise<ProjectCharacter> {
  const response = await api.put(`/projects/${projectId}/characters/${characterId}`, data);
  return response.data;
}

// 删除角色
export async function deleteCharacter(projectId: string, characterId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/characters/${characterId}`);
}

// AI 生成角色
export async function generateCharacters(
  projectId: string,
  data: GenerateCharactersRequest
): Promise<GenerateCharactersResponse> {
  const response = await api.post(`/projects/${projectId}/characters/generate`, data);
  return response.data;
}

// AI 生成角色描述
export async function generateCharacterDescription(
  projectId: string,
  characterName: string
): Promise<string> {
  const response = await api.post(`/projects/${projectId}/characters/generate-description`, {
    characterName,
  });
  return response.data.description;
}

// 获取数字人列表
export async function getDigitalHumans(
  projectId: string,
  characterId: string
): Promise<DigitalHuman[]> {
  const response = await api.get(`/projects/${projectId}/characters/${characterId}/digital-humans`);
  return response.data.data || [];
}

// 生成数字人（异步）
export async function generateDigitalHumans(
  projectId: string,
  characterId: string,
  count: number = 1,
  size?: string
): Promise<{ batchId: string; status: string; message: string }> {
  const response = await api.post(
    `/projects/${projectId}/characters/${characterId}/digital-humans/generate`,
    { count, size }
  );
  return response.data;
}

// 选择数字人
export async function selectDigitalHuman(
  projectId: string,
  characterId: string,
  humanId: string
): Promise<DigitalHuman> {
  const response = await api.put(
    `/projects/${projectId}/characters/${characterId}/digital-humans/${humanId}/select`
  );
  return response.data.data;
}

