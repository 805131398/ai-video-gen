import api from './api';
import { ProjectScript, ScriptScene, SceneContent, SceneVideo } from '../types';

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
    existingSynopsis?: string; // 用户已输入的内容
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

// 为剧本生成视频
export const generateScriptVideos = async (
  projectId: string,
  scriptId: string,
  options?: {
    promptType?: 'smart_combine' | 'ai_optimized';
    sceneIds?: string[]; // 可选：指定要生成视频的场景 ID
  }
): Promise<{ taskId: string; message: string; sceneCount: number }> => {
  const response = await api.post(
    `/projects/${projectId}/scripts/${scriptId}/generate-videos`,
    options
  );
  return response.data;
};

// 为单个场景生成视频
export const generateSceneVideo = async (
  projectId: string,
  scriptId: string,
  sceneId: string,
  options?: {
    promptType?: 'smart_combine' | 'ai_optimized';
    useStoryboard?: boolean;
    useCharacterImage?: boolean;
    referenceImage?: string;
    aspectRatio?: string;
    duration?: number;
    hd?: boolean;
  }
): Promise<{ taskId: string; message: string; sceneCount: number }> => {
  const response = await api.post(
    `/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}/generate-video`,
    options
  );
  return response.data;
};

// 查询视频生成状态
export const getVideosGenerationStatus = async (
  projectId: string,
  scriptId: string
): Promise<{
  success: boolean;
  scriptId: string;
  overallStatus: 'not_started' | 'generating' | 'completed' | 'failed' | 'partial';
  scenes: Array<{
    sceneId: string;
    sceneTitle: string;
    status: 'pending' | 'generating' | 'completed' | 'failed' | 'no_video';
    progress: number;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    duration?: number | null;
    errorMessage?: string | null;
    videoId?: string | null;
    createdAt?: string | null;
  }>;
  totalScenes: number;
  completedScenes: number;
  failedScenes: number;
  generatingScenes: number;
}> => {
  const response = await api.get(
    `/projects/${projectId}/scripts/${scriptId}/videos/status`
  );
  return response.data;
};

// 获取场景的所有历史视频
export const getSceneVideos = async (
  projectId: string,
  scriptId: string,
  sceneId: string
): Promise<SceneVideo[]> => {
  const response = await api.get(
    `/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}/videos`
  );
  return response.data.data;
};

// 选择场景视频（标记为 isSelected）
export const selectSceneVideo = async (
  projectId: string,
  scriptId: string,
  sceneId: string,
  videoId: string
): Promise<void> => {
  await api.patch(
    `/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}/videos/${videoId}/select`
  );
};

// 删除场景视频
export const deleteSceneVideo = async (
  projectId: string,
  scriptId: string,
  sceneId: string,
  videoId: string
): Promise<void> => {
  await api.delete(
    `/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}/videos/${videoId}`
  );
};

