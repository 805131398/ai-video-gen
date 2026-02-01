// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
}

// Token 类型
export interface Tokens {
  access_token: string;
  refresh_token: string;
}

// 订阅状态
export interface SubscriptionStatus {
  is_active: boolean;
  type: 'monthly' | 'quarterly' | 'yearly' | null;
  expires_at: string | null;
  days_remaining: number;
}

// 激活码记录
export interface ActivationRecord {
  id?: number;
  code: string;
  type: 'monthly' | 'quarterly' | 'yearly';
  activated_at: string;
  expires_at: string;
  created_at?: string;
}

// 项目角色
export interface ProjectCharacter {
  id: string;
  projectId: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  attributes?: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  digitalHumans?: DigitalHuman[];
}

// 数字人形象
export interface DigitalHuman {
  id: string;
  characterId: string;
  imageUrl: string;
  prompt: string;
  isSelected: boolean;
  createdAt: string;
}

// 项目
export interface Project {
  id: string;
  userId: string;
  topic: string;
  title?: string | null;
  status: string;
  currentStep: string;
  themeName?: string | null;
  themeDesc?: string | null;
  createdAt: string;
  updatedAt: string;
  characters?: ProjectCharacter[];
}

// 创建项目请求
export interface CreateProjectRequest {
  topic: string;
  title?: string;
  themeName?: string;
  themeDesc?: string;
}

// 创建/更新角色请求
export interface CreateCharacterRequest {
  name: string;
  description: string;
  avatarUrl?: string;
  attributes?: Record<string, unknown>;
  sortOrder?: number;
}

// AI 生成角色请求
export interface GenerateCharactersRequest {
  topic: string;
  count?: number;
}

// AI 生成角色响应
export interface GenerateCharactersResponse {
  characters: Array<{
    name: string;
    description: string;
    attributes?: Record<string, unknown>;
  }>;
}

// Electron API 类型
export interface ElectronAPI {
  db: {
    getUser: () => Promise<User | null>;
    saveUser: (user: User) => Promise<boolean>;
    saveActivationCode: (code: ActivationRecord) => Promise<boolean>;
    getActivationHistory: () => Promise<ActivationRecord[]>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    save: (key: string, value: string) => Promise<boolean>;
  };
  storage: {
    selectFolder: () => Promise<string | undefined>;
    getDefaultPath: () => Promise<string>;
    calculateSize: (path: string) => Promise<{ bytes: number; count: number }>;
    clearCache: (path: string) => Promise<{ success: boolean; deletedCount: number }>;
  };
  app: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}

// 扩展 Window 接口
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// 剧本场景内容
export interface SceneContent {
  description: string;
  characterId: string; // 主要角色ID
  otherCharacters?: Array<{
    characterId: string;
    role: string; // 在场景中的角色描述
  }>;
  actions: {
    entrance: string; // 入场动作
    main: string;     // 主要动作
    exit: string;     // 出场动作
  };
  dialogues: Array<{
    text: string;
    speaker: string; // 说话人（角色名称）
  }>;
  camera: {
    type: 'fixed' | 'follow' | 'orbit' | 'handheld';
    movement: 'push' | 'pull' | 'pan' | 'tilt' | 'dolly';
    shotSize: 'closeup' | 'close' | 'medium' | 'full' | 'wide';
    description: string;
  };
  visual: {
    lighting: 'daylight' | 'night' | 'indoor' | 'golden' | 'overcast';
    mood: 'warm' | 'cool' | 'vintage' | 'vibrant' | 'muted';
    effects: string;
    description: string;
  };
  audio: {
    bgMusic: string;
    soundEffects: string; // 字符串，不是数组
    volume: number; // 0-100
  };
}

// 剧本场景
export interface ScriptScene {
  id: string;
  scriptId: string;
  title: string;
  sortOrder: number;
  duration?: number | null;
  content: SceneContent;
  createdAt: string;
  updatedAt: string;
}

// 项目剧本
export interface ProjectScript {
  id: string;
  projectId: string;
  characterId: string;
  title: string;
  description?: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  character?: ProjectCharacter;
  scenes?: ScriptScene[];
}

// 场景视频
export interface SceneVideo {
  id: string;
  sceneId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  prompt: string;
  promptType: 'smart_combine' | 'ai_optimized';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  taskId?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

// 视频生成状态
export interface VideoGenerationStatus {
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
}

// 存储路径类型
export type StoragePathType = 'default' | 'documents' | 'downloads' | 'custom';

// 存储配置
export interface StorageConfig {
  pathType: StoragePathType;
  customPath: string;
  currentPath: string;
}

// 存储使用情况
export interface StorageUsage {
  totalBytes: number;
  fileCount: number;
  lastCalculated: Date | null;
}

