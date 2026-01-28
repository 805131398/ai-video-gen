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
  sceneType: 'indoor' | 'outdoor' | 'special';
  characters: Array<{
    characterId: string;
    characterName: string;
    action: string;
    emotion: string;
    position: 'left' | 'center' | 'right';
  }>;
  dialogues: Array<{
    characterId: string;
    text: string;
    speed: 'slow' | 'normal' | 'fast';
    tone: string;
  }>;
  camera: {
    type: 'closeup' | 'medium' | 'full' | 'wide';
    movement: 'static' | 'push' | 'pull' | 'follow';
  };
  visual: {
    transition: string;
    effects: string[];
    subtitleStyle: string;
  };
  audio: {
    bgm: string;
    soundEffects: string[];
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
