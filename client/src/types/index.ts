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
  projectId?: string | null;
  tenantId?: string | null;
  userId?: string | null;
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

// 文件信息读取结果
export interface FileInfoResult {
  success: boolean;
  base64?: string;
  hash?: string;
  size?: number;
  mimeType?: string;
  fileName?: string;
  error?: string;
}

// 供应商上传记录
export interface ProviderUploadRecord {
  id?: number;
  localResourceHash: string;
  localPath?: string;
  providerName: string;
  remoteUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiresAt?: string;
  createdAt?: string;
}

// Electron API 类型
export interface ElectronAPI {
  db: {
    getUser: () => Promise<User | null>;
    saveUser: (user: User) => Promise<boolean>;
    saveActivationCode: (code: ActivationRecord) => Promise<boolean>;
    getActivationHistory: () => Promise<ActivationRecord[]>;
    // 项目管理
    saveProject: (project: Project) => Promise<boolean>;
    getProject: (projectId: string) => Promise<Project | null>;
    getProjects: () => Promise<Project[]>;
    deleteProject: (projectId: string) => Promise<boolean>;
    // 角色管理
    saveCharacter: (character: ProjectCharacter) => Promise<boolean>;
    getProjectCharacters: (projectId: string) => Promise<ProjectCharacter[]>;
    getAllCharacters: () => Promise<ProjectCharacter[]>;
    deleteCharacter: (characterId: string) => Promise<boolean>;
    // 数字人管理
    saveDigitalHuman: (digitalHuman: DigitalHuman) => Promise<boolean>;
    getDigitalHumans: (characterId: string) => Promise<DigitalHuman[]>;
    deleteDigitalHuman: (digitalHumanId: string) => Promise<boolean>;
    // 剧本管理
    saveScript: (script: ProjectScript) => Promise<boolean>;
    getProjectScripts: (projectId: string) => Promise<ProjectScript[]>;
    deleteScript: (scriptId: string) => Promise<boolean>;
    // 场景管理
    saveScene: (scene: ScriptScene) => Promise<boolean>;
    getScriptScenes: (scriptId: string) => Promise<ScriptScene[]>;
    deleteScene: (sceneId: string) => Promise<boolean>;
    // 场景视频管理
    saveSceneVideo: (video: SceneVideo) => Promise<boolean>;
    getSceneVideos: (sceneId: string) => Promise<SceneVideo[]>;
    deleteSceneVideo: (videoId: string) => Promise<boolean>;
    // 生成快照管理
    saveGenerationSnapshot: (snapshot: GenerationSnapshot) => Promise<boolean>;
    getGenerationSnapshots: (sceneId: string) => Promise<GenerationSnapshot[]>;
    // 场景提示词缓存管理
    saveScenePromptCache: (cache: ScenePromptCache) => Promise<boolean>;
    getScenePromptCache: (sceneId: string) => Promise<ScenePromptCache | null>;
    // 供应商上传记录管理
    getProviderUploadRecord: (localResourceHash: string, providerName: string) => Promise<ProviderUploadRecord | null>;
    saveProviderUploadRecord: (record: ProviderUploadRecord) => Promise<boolean>;
    deleteProviderUploadRecord: (localResourceHash: string, providerName: string) => Promise<boolean>;
    // AI 工具配置管理
    saveAiToolConfig: (config: AiToolConfig) => Promise<boolean>;
    getAiToolConfigs: () => Promise<AiToolConfig[]>;
    getAiToolConfigsByType: (toolType: string) => Promise<AiToolConfig[]>;
    getDefaultAiToolConfig: (toolType: string) => Promise<AiToolConfig | null>;
    setDefaultAiToolConfig: (toolType: string, configId: string) => Promise<boolean>;
    deleteAiToolConfig: (configId: string) => Promise<boolean>;
    // 对话管理
    saveChatConversation: (conversation: ChatConversation) => Promise<boolean>;
    getChatConversations: () => Promise<ChatConversation[]>;
    deleteChatConversation: (conversationId: string) => Promise<boolean>;
    updateChatConversationTitle: (conversationId: string, title: string) => Promise<boolean>;
    // 对话消息管理
    saveChatMessage: (message: ChatMessage) => Promise<boolean>;
    getChatMessages: (conversationId: string) => Promise<ChatMessage[]>;
    deleteChatMessages: (conversationId: string) => Promise<boolean>;
    // 使用日志管理
    saveAiUsageLog: (log: AiUsageLog) => Promise<boolean>;
    getAiUsageLogs: (query: UsageStatsQuery) => Promise<{ logs: AiUsageLog[]; total: number }>;
    getUsageStatsSummary: (query: UsageStatsQuery) => Promise<UsageStatsSummary>;
    getDailyUsageStats: (query: UsageStatsQuery) => Promise<DailyUsageStat[]>;
    deleteAiUsageLog: (logId: string) => Promise<boolean>;
    clearAiUsageLogs: () => Promise<boolean>;
  };
  resources: {
    download: (params: DownloadResourceParams) => Promise<DownloadResult>;
    getStatus: (resourceType: string, resourceId: string) => Promise<ResourceDownloadStatus | null>;
    retry: (resourceType: string, resourceId: string) => Promise<DownloadResult>;
    readFileInfo: (filePath: string) => Promise<FileInfoResult>;
    openFolder?: (filePath?: string) => Promise<{ success: boolean; error?: string; path?: string }>;
    getRootPath?: () => Promise<string>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    save: (key: string, value: string) => Promise<boolean>;
  };
  storage: {
    selectFolder: () => Promise<string | undefined>;
    selectFile: (options?: { filters?: { name: string; extensions: string[] }[]; title?: string }) => Promise<string | undefined>;
    getDefaultPath: () => Promise<string>;
    calculateSize: (path: string) => Promise<{ bytes: number; count: number }>;
    clearCache: (path: string) => Promise<{ success: boolean; deletedCount: number }>;
  };
  app: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  chat: {
    sendMessage: (request: AiChatRequest) => Promise<string>;
    onStreamChunk: (callback: (chunk: AiChatStreamChunk) => void) => () => void;
  };
  // 视频生成
  video: {
    generate: (request: VideoGenerateRequest) => Promise<VideoGenerateResult>;
    pollStatus: (request: VideoPollStatusRequest) => Promise<VideoPollStatusResult>;
    upload: (request: VideoUploadRequest) => Promise<VideoUploadResult>;
  };
}

// 资源下载参数
export interface DownloadResourceParams {
  url: string;
  resourceType: 'character_avatar' | 'digital_human' | 'scene_video' | 'video_thumbnail' | 'chat_resource';
  resourceId: string;
  projectId?: string;
  characterId?: string;
  sceneId?: string;
  conversationId?: string;
  customSavePath?: string; // 另存为时的自定义路径
}

// 下载结果
export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

// 资源下载状态
export interface ResourceDownloadStatus {
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress?: number;
  localPath?: string;
  error?: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

// 剧本场景内容
export interface SceneContent {
  description?: string;
  sceneType?: 'indoor' | 'outdoor' | 'special';
  characters?: Array<{
    characterId: string;
    characterName?: string;
    action?: string;
    emotion?: string;
    position?: 'left' | 'center' | 'right';
  }>;
  dialogues?: Array<{
    characterId?: string;
    text: string;
    speed?: 'slow' | 'normal' | 'fast';
    tone?: string;
  }>;
  camera?: {
    type?: 'closeup' | 'medium' | 'full' | 'wide' | 'fixed' | 'follow' | 'orbit' | 'handheld';
    movement?: 'static' | 'push' | 'pull' | 'follow' | 'pan' | 'tilt' | 'dolly';
    shotSize?: 'closeup' | 'close' | 'medium' | 'full' | 'wide';
    description?: string;
  };
  visual?: {
    transition?: string;
    effects?: string[] | string;
    subtitleStyle?: string;
    lighting?: 'daylight' | 'night' | 'indoor' | 'golden' | 'overcast' | 'studio' | 'dramatic';
    mood?: 'warm' | 'cool' | 'vintage' | 'vibrant' | 'muted' | 'bright' | 'dark' | 'contrasty';
    description?: string;
  };
  audio?: {
    bgm?: string;
    bgMusic?: string;
    soundEffects?: string[] | string;
    volume?: number;
  };
  // Fallback for old schema
  characterId?: string;
  actions?: Record<string, any>;
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
  characterId?: string;
  title: string;
  name?: string;
  tone?: string;
  synopsis?: string;
  characterIds?: string[];
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

// 提示词预览请求
export interface PreviewPromptRequest {
  promptType?: 'smart_combine' | 'ai_optimized';
  useStoryboard?: boolean;
  useCharacterImage?: boolean;
  withVoice?: boolean;
  voiceLanguage?: 'zh' | 'en';
}

// 提示词预览响应
export interface PreviewPromptResponse {
  success: boolean;
  prompt: { en: string; zh: string };
  characterInfo: {
    characterId?: string;
    characterName?: string;
    digitalHumanId?: string;
    referenceImage?: string;
    imageSource?: 'digital_human' | 'avatar';
  };
}

// 生成操作快照（本地 SQLite）
export interface GenerationSnapshot {
  id: string;
  projectId: string;
  scriptId: string;
  sceneId: string;
  videoId?: string;
  originalPrompt: string;
  finalPrompt: string;
  promptType: string;
  useStoryboard: boolean;
  useCharacterImage: boolean;
  aspectRatio: string;
  characterId?: string;
  characterName?: string;
  digitalHumanId?: string;
  referenceImage?: string;
  sceneContent: string; // JSON string
  createdAt: string;
}

// 场景提示词缓存（本地 SQLite）
export interface ScenePromptCache {
  sceneId: string;
  projectId: string;
  scriptId: string;
  promptEn: string;
  promptZh: string;
  promptType: string;
  useStoryboard: boolean;
  useCharacterImage: boolean;
  aspectRatio: string;
  characterId?: string;
  characterName?: string;
  digitalHumanId?: string;
  referenceImage?: string;
  imageSource?: 'digital_human' | 'avatar';
  withVoice: boolean;
  voiceLanguage: 'zh' | 'en';
  updatedAt?: string;
}

// AI 工具类型
export type AiToolType = 'text_chat' | 'image_gen' | 'video_gen' | 'music_gen';

// 动态参数字段定义
export interface ParamField {
  key: string;                          // 请求体中的字段名，支持点号嵌套如 "metadata.n"
  label: string;                        // 显示名称
  value: string | number | boolean;     // 默认值
  type: 'string' | 'number' | 'boolean' | 'select' | 'file';  // 值类型
  options?: (string | number)[];        // select 类型的可选值
  remark?: string;                      // 备注说明
  required?: boolean;                   // 是否必填
}

// 响应字段映射（适配器模式：内部标准 key → API 实际字段路径）
export interface ResponseField {
  key: string;       // 内部标准标识，如 "taskId", "videoUrl", "status"
  label: string;     // 显示名称
  path: string;      // API 响应 JSON 中的字段路径，如 "id", "output.video_url"
  remark?: string;   // 备注说明
}

// 单个接口的完整配置
export interface EndpointConfig {
  path: string;                     // 接口路径，如 "/videos/generations"
  method: 'GET' | 'POST';          // 请求方法
  params: ParamField[];             // 请求参数
  responseMapping: ResponseField[]; // 响应字段映射
}

// 视频生成专属配置
export interface VideoGenConfig {
  endpoints: {
    generate: EndpointConfig;   // 生成接口
    status: EndpointConfig;     // 状态查询接口
    upload: EndpointConfig;     // 图片上传接口
  };
}

// AI 工具配置
export interface AiToolConfig {
  id: string;
  toolType: AiToolType;
  name: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  modelName?: string | null;
  description?: string | null;
  isDefault: boolean;
  sortOrder: number;
  extraConfig?: VideoGenConfig | null;
  createdAt: string;
  updatedAt: string;
}

// 对话会话
export interface ChatConversation {
  id: string;
  title: string;
  modelConfigId: string | null;
  toolType: AiToolType;
  createdAt: string;
  updatedAt: string;
}

// 对话消息
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  modelName: string | null;
  createdAt: string;
  // 视频生成相关
  videoMeta?: {
    taskId?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    prompt?: string;
    params?: Record<string, any>;
    status?: string;
    modelConfigId?: string;
  } | null;
}

// AI 聊天请求参数
export interface AiChatRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  conversationId?: string;
  modelConfigId?: string;
  toolType?: AiToolType;
}

// AI 聊天流式响应块
export interface AiChatStreamChunk {
  type: 'delta' | 'done' | 'error';
  content?: string;
  error?: string;
}

// 视频生成请求参数
export interface VideoGenerateRequest {
  baseUrl: string;
  apiKey: string;
  generateConfig: EndpointConfig;
  prompt: string;
  imageUrl?: string;
  paramValues: Record<string, string | number | boolean>;
  conversationId?: string;
  modelConfigId?: string;
  modelName?: string;
}

// 视频生成响应
export interface VideoGenerateResult {
  success: boolean;
  taskId?: string;
  error?: string;
  rawResponse?: any;
}

// 视频状态轮询请求
export interface VideoPollStatusRequest {
  baseUrl: string;
  apiKey: string;
  statusConfig: EndpointConfig;
  taskId: string;
  conversationId?: string;
  modelConfigId?: string;
  modelName?: string;
}

// 视频状态轮询响应
export interface VideoPollStatusResult {
  success: boolean;
  status?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  rawResponse?: any;
}

// 视频上传请求
export interface VideoUploadRequest {
  baseUrl: string;
  apiKey: string;
  uploadConfig: EndpointConfig;
  filePath: string;
}

// 视频上传响应
export interface VideoUploadResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

// 视频生成进度状态（前端用）
export interface VideoGenProgress {
  stage: 'uploading' | 'submitting' | 'generating' | 'completed' | 'failed';
  taskId?: string;
  status?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// AI 使用日志
export interface AiUsageLog {
  id: string;
  toolType: AiToolType;
  modelName: string | null;
  modelConfigId: string | null;
  status: 'success' | 'error';
  errorMessage: string | null;
  durationMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  requestBody: string | null;
  responseBody: string | null;
  userInput: string | null;
  aiOutput: string | null;
  conversationId: string | null;
  baseUrl: string | null;
  temperature: number | null;
  maxTokens: number | null;
  extraData: string | null;
  createdAt: string;
}

// 使用统计查询参数
export interface UsageStatsQuery {
  toolType?: AiToolType;
  status?: 'success' | 'error';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// 使用统计汇总
export interface UsageStatsSummary {
  totalCount: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  totalDurationMs: number;
}

// 每日统计（趋势图用）
export interface DailyUsageStat {
  date: string;
  count: number;
  tokens: number;
}
