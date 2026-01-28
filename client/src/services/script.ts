import api from './api';
import { ProjectScript, ScriptScene, SceneContent } from '../types';

// 获取项目的所有剧本
export const getProjectScripts = async (projectId: string): Promise<ProjectScript[]> => {
  const response = await api.get(`/projects/${projectId}/scripts`);
  return response.data.data;
};

// 获取剧本详情
export const getScript = async (projectId: string, scriptId: string): Promise<ProjectScript> => {
  const response = await api.get(`/projects/${projectId}/scripts/${scriptId}`);
  return response.data.data;
};

// 创建剧本
export const createScript = async (
  projectId: string,
  data: {
    name: string;
    tone?: string;
    synopsis?: string;
    characterIds: string[];
  }
): Promise<ProjectScript> => {
  const response = await api.post(`/projects/${projectId}/scripts`, data);
  return response.data.data;
};

// 更新剧本
export const updateScript = async (
  projectId: string,
  scriptId: string,
  data: {
    name: string;
    tone?: string;
    synopsis?: string;
    characterIds: string[];
  }
): Promise<ProjectScript> => {
  const response = await api.put(`/projects/${projectId}/scripts/${scriptId}`, data);
  return response.data.data;
};

// 删除剧本
export const deleteScript = async (projectId: string, scriptId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}/scripts/${scriptId}`);
};

// 获取剧本的所有场景
export const getScriptScenes = async (projectId: string, scriptId: string): Promise<ScriptScene[]> => {
  const response = await api.get(`/projects/${projectId}/scripts/${scriptId}/scenes`);
  return response.data.data;
};

// 获取单个场景详情
export const getScene = async (
  projectId: string,
  scriptId: string,
  sceneId: string
): Promise<ScriptScene> => {
  const response = await api.get(`/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}`);
  return response.data.data;
};

// 创建场景
export const createScene = async (
  projectId: string,
  scriptId: string,
  data: {
    title?: string;
    duration?: number;
    content?: SceneContent;
  }
): Promise<ScriptScene> => {
  const response = await api.post(`/projects/${projectId}/scripts/${scriptId}/scenes`, data);
  return response.data.data;
};

// 更新场景
export const updateScene = async (
  projectId: string,
  scriptId: string,
  sceneId: string,
  data: {
    title?: string;
    sortOrder?: number;
    duration?: number;
    content?: SceneContent;
  }
): Promise<ScriptScene> => {
  const response = await api.put(`/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}`, data);
  return response.data.data;
};

// 删除场景
export const deleteScene = async (
  projectId: string,
  scriptId: string,
  sceneId: string
): Promise<void> => {
  await api.delete(`/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}`);
};

// 批量更新场景排序
export const updateScenesOrder = async (
  projectId: string,
  scriptId: string,
  sceneIds: string[]
): Promise<void> => {
  await api.put(`/projects/${projectId}/scripts/${scriptId}/scenes/reorder`, {
    sceneIds,
  });
};

// AI 生成脚本大概
export const generateSynopsis = async (
  projectId: string,
  data: {
    characterIds: string[];
    tone?: string;
  }
): Promise<{ synopsis: string }> => {
  const response = await api.post(`/projects/${projectId}/scripts/generate-synopsis`, data);
  return response.data;
};

// AI 生成场景
export const generateScenes = async (
  projectId: string,
  data: {
    characterIds: string[];
    tone?: string;
    synopsis: string;
    sceneCount: number;
  }
): Promise<{ scenes: Array<{ title: string; duration: number; content: SceneContent }> }> => {
  const response = await api.post(`/projects/${projectId}/scripts/generate-scenes`, data);
  return response.data;
};
