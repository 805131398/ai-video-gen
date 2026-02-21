import { ProjectScript, ScriptScene, SceneContent, SceneVideo } from '../types';

import api from './api';

// 获取项目的所有剧本
export const getProjectScripts = async (projectId: string): Promise<ProjectScript[]> => {
  if (window.electron?.db) {
    return await window.electron.db.getProjectScripts(projectId);
  }
  return [];
};

// 获取剧本详情
export const getScript = async (projectId: string, scriptId: string): Promise<ProjectScript> => {
  if (window.electron?.db) {
    const scripts = await window.electron.db.getProjectScripts(projectId);
    const script = scripts.find(s => s.id === scriptId);
    if (script) return script;
  }
  throw new Error('Script not found');
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
  const script: ProjectScript = {
    id: crypto.randomUUID(),
    projectId,
    name: data.name,
    title: data.name,
    tone: data.tone,
    synopsis: data.synopsis,
    characterIds: data.characterIds,
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (window.electron?.db) {
    await window.electron.db.saveScript(script);
  }
  return script;
};

// 更新剧本
export const updateScript = async (
  projectId: string,
  scriptId: string,
  data: {
    name?: string;
    tone?: string;
    synopsis?: string;
    characterIds?: string[];
  }
): Promise<ProjectScript> => {
  const script = await getScript(projectId, scriptId);
  const updatedScript = { ...script, ...data, updatedAt: new Date().toISOString() };
  if (data.name) updatedScript.title = data.name;

  if (window.electron?.db) {
    await window.electron.db.saveScript(updatedScript);
  }
  return updatedScript;
};

// 删除剧本
export const deleteScript = async (_projectId: string, scriptId: string): Promise<void> => {
  if (window.electron?.db) {
    await window.electron.db.deleteScript(scriptId);
  }
};

// 获取剧本的所有场景
export const getScriptScenes = async (_projectId: string, scriptId: string): Promise<ScriptScene[]> => {
  if (window.electron?.db) {
    return await window.electron.db.getScriptScenes(scriptId);
  }
  return [];
};

// 获取单个场景详情
export const getScene = async (
  _projectId: string,
  scriptId: string,
  sceneId: string
): Promise<ScriptScene> => {
  if (window.electron?.db) {
    const scenes = await window.electron.db.getScriptScenes(scriptId);
    const scene = scenes.find(s => s.id === sceneId);
    if (scene) return scene;
  }
  throw new Error('Scene not found');
};

// 创建场景
export const createScene = async (
  _projectId: string,
  scriptId: string,
  data: {
    title?: string;
    duration?: number;
    content?: SceneContent;
  }
): Promise<ScriptScene> => {
  const scenes = await getScriptScenes(_projectId, scriptId);
  const maxOrder = scenes.reduce((max, s) => Math.max(max, s.sortOrder || 0), -1);

  const scene: ScriptScene = {
    id: crypto.randomUUID(),
    scriptId,
    title: data.title || `场景 ${maxOrder + 2}`,
    sortOrder: maxOrder + 1,
    duration: data.duration,
    content: data.content || ({} as SceneContent),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (window.electron?.db) {
    await window.electron.db.saveScene(scene);
  }
  return scene;
};

// 更新场景
export const updateScene = async (
  _projectId: string,
  scriptId: string,
  sceneId: string,
  data: {
    title?: string;
    sortOrder?: number;
    duration?: number;
    content?: SceneContent;
  }
): Promise<ScriptScene> => {
  const scene = await getScene(_projectId, scriptId, sceneId);
  const updatedScene = { ...scene, ...data, updatedAt: new Date().toISOString() };

  if (window.electron?.db) {
    await window.electron.db.saveScene(updatedScene);
  }
  return updatedScene;
};

// 删除场景
export const deleteScene = async (
  _projectId: string,
  _scriptId: string,
  sceneId: string
): Promise<void> => {
  if (window.electron?.db) {
    await window.electron.db.deleteScene(sceneId);
  }
};

// 批量更新场景排序
export const updateScenesOrder = async (
  _projectId: string,
  scriptId: string,
  sceneIds: string[]
): Promise<void> => {
  if (window.electron?.db) {
    const scenes = await window.electron.db.getScriptScenes(scriptId);
    for (let i = 0; i < sceneIds.length; i++) {
      const id = sceneIds[i];
      const scene = scenes.find(s => s.id === id);
      if (scene) {
        scene.sortOrder = i;
        await window.electron.db.saveScene(scene);
      }
    }
  }
};

// AI 生成脚本大概 (改为直接调用云端，无状态保存)
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

// AI 生成场景 (调用云端生成结构化的场景体，但不自动入库，前端自己保存)
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

// 为剧本生成视频 (纯 AI API 调度)
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

// 为单个场景生成视频 (纯 AI API 调度)
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
    customPrompt?: string;
    withVoice?: boolean;
    voiceLanguage?: 'zh' | 'en';
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
  _projectId: string,
  _scriptId: string,
  sceneId: string
): Promise<SceneVideo[]> => {
  if (window.electron?.db) {
    return await window.electron.db.getSceneVideos(sceneId);
  }
  return [];
};

// 选择场景视频（标记为 isSelected）
export const selectSceneVideo = async (
  _projectId: string,
  _scriptId: string,
  sceneId: string,
  videoId: string
): Promise<void> => {
  if (window.electron?.db) {
    const videos = await window.electron.db.getSceneVideos(sceneId);
    for (const video of videos) {
      if (video.id === videoId) {
        video.isSelected = true;
      } else {
        video.isSelected = false;
      }
      await window.electron.db.saveSceneVideo(video);
    }
  }
};

// 删除场景视频
export const deleteSceneVideo = async (
  _projectId: string,
  _scriptId: string,
  _sceneId: string,
  videoId: string
): Promise<void> => {
  if (window.electron?.db) {
    await window.electron.db.deleteSceneVideo(videoId);
  }
};



// 预览提示词
export const previewPrompt = async (
  projectId: string,
  scriptId: string,
  sceneId: string,
  options: any
): Promise<{ prompt: { en: string; zh: string }; characterInfo?: any }> => {
  const response = await api.post(`/projects/${projectId}/scripts/${scriptId}/scenes/${sceneId}/prompt`, options);
  return response.data;
};

// 翻译提示词
export const translatePrompt = async (
  projectId: string,
  text: string,
  direction: 'zh-en' | 'en-zh'
): Promise<string> => {
  const response = await api.post(`/projects/${projectId}/translate`, { text, direction });
  return response.data.translated;
};
