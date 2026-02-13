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
import {
  syncProjectToLocal,
  syncCharacterToLocal,
  syncDigitalHumanToLocal,
  getProjectFromLocal,
  getProjectsFromLocal,
  getCharactersFromLocal,
  getDigitalHumansFromLocal,
} from './localDataService';

// 创建项目
export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await api.post('/projects', data);
  const project = response.data;

  // POST 只返回 { id }，补充必要字段后再同步到本地
  if (project.id && window.electron?.db) {
    const fullProject: Project = {
      id: project.id,
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
    await syncProjectToLocal(fullProject);
  }

  return project;
}

// 获取项目详情
export async function getProject(id: string): Promise<Project> {
  // 优先从本地获取
  const localProject = await getProjectFromLocal(id);
  if (localProject) {
    return localProject;
  }

  // 本地没有，从服务端获取
  const response = await api.get(`/projects/${id}`);
  const project = response.data;

  // 同步到本地
  await syncProjectToLocal(project);

  return project;
}

// 获取项目列表
export async function getProjects(): Promise<Project[]> {
  // 优先从本地获取
  const localProjects = await getProjectsFromLocal();
  if (localProjects.length > 0) {
    return localProjects;
  }

  // 本地没有，从服务端获取
  const response = await api.get('/projects');
  const projects = response.data.data || [];

  // 同步到本地
  for (const project of projects) {
    await syncProjectToLocal(project);
  }

  return projects;
}

// 更新项目
export async function updateProject(id: string, data: Partial<CreateProjectRequest>): Promise<Project> {
  const response = await api.put(`/projects/${id}`, data);
  const project = response.data?.data || response.data;

  // PUT 返回的 Prisma 对象可能没有 currentStep，同步时提供默认值
  if (window.electron?.db) {
    await syncProjectToLocal(project);
  }

  return project;
}

// 删除项目
export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`);

  // 从本地删除
  if (window.electron?.db) {
    await window.electron.db.deleteProject(id);
  }
}

// 获取项目角色列表
export async function getProjectCharacters(projectId: string): Promise<ProjectCharacter[]> {
  // 优先从本地获取
  const localCharacters = await getCharactersFromLocal(projectId);
  if (localCharacters.length > 0) {
    return localCharacters;
  }

  // 本地没有，从服务端获取
  const response = await api.get(`/projects/${projectId}/characters`);
  const characters = response.data.data || [];

  // 同步到本地
  for (const character of characters) {
    await syncCharacterToLocal(projectId, character);
  }

  return characters;
}

// 创建角色
export async function createCharacter(
  projectId: string,
  data: CreateCharacterRequest
): Promise<ProjectCharacter> {
  const response = await api.post(`/projects/${projectId}/characters`, data);
  const character = response.data;

  // 同步到本地
  await syncCharacterToLocal(projectId, character);

  return character;
}

// 更新角色
export async function updateCharacter(
  projectId: string,
  characterId: string,
  data: Partial<CreateCharacterRequest>
): Promise<ProjectCharacter> {
  const response = await api.put(`/projects/${projectId}/characters/${characterId}`, data);
  const character = response.data;

  // 同步到本地
  await syncCharacterToLocal(projectId, character);

  return character;
}

// 删除角色
export async function deleteCharacter(projectId: string, characterId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/characters/${characterId}`);

  // 从本地删除
  if (window.electron?.db) {
    await window.electron.db.deleteCharacter(characterId);
  }
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
  characterId: string,
  forceRemote: boolean = false
): Promise<DigitalHuman[]> {
  // 优先从本地获取（除非强制从服务端获取）
  if (!forceRemote) {
    const localDigitalHumans = await getDigitalHumansFromLocal(characterId);
    if (localDigitalHumans.length > 0) {
      return localDigitalHumans;
    }
  }

  // 从服务端获取
  const response = await api.get(`/projects/${projectId}/characters/${characterId}/digital-humans`);
  const digitalHumans = response.data.data || [];

  // 同步到本地
  for (const dh of digitalHumans) {
    await syncDigitalHumanToLocal(projectId, characterId, dh);
  }

  return digitalHumans;
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
  const digitalHuman = response.data.data;

  // 同步到本地
  await syncDigitalHumanToLocal(projectId, characterId, digitalHuman);

  return digitalHuman;
}

