// AI Video Creation Tool Type Definitions

// ==================== Enums ====================

export type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

export type StepType =
  | 'TOPIC_INPUT'
  | 'TITLE_GENERATE'
  | 'TITLE_SELECT'
  | 'ATTRIBUTE_SET'
  | 'COPY_GENERATE'
  | 'COPY_SELECT'
  | 'COPY_SEGMENT'
  | 'IMAGE_GENERATE'
  | 'IMAGE_SELECT'
  | 'VIDEO_GENERATE'
  | 'VIDEO_SELECT'
  | 'VOICE_CONFIG'
  | 'VOICE_GENERATE'
  | 'COMPOSE';

export type StepStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type AIModelType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE';

export type TemplateType = 'TITLE' | 'COPYWRITING' | 'IMAGE';

export type AILogStatus = 'SUCCESS' | 'FAILED';

// ==================== Project Types ====================

export interface Project {
  id: string;
  userId: string;
  tenantId?: string | null;
  title?: string | null;
  topic: string;
  status: ProjectStatus;
  currentVersionId?: string | null;
  coverUrl?: string | null;
  finalVideoUrl?: string | null;
  isPublic: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Relations
  versions?: ProjectVersion[];
  currentVersion?: ProjectVersion | null;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  parentVersionId?: string | null;
  versionNo: number;
  branchName?: string | null;
  currentStep: StepType;
  isMain: boolean;
  createdAt: Date | string;
  // Relations
  project?: Project;
  parentVersion?: ProjectVersion | null;
  childVersions?: ProjectVersion[];
  steps?: ProjectStep[];
}

export interface ProjectStep {
  id: string;
  versionId: string;
  stepType: StepType;
  selectedOptionId?: string | null;
  attributes?: CopywritingAttributes | null;
  status: StepStatus;
  createdAt: Date | string;
  // Relations
  version?: ProjectVersion;
  options?: StepOption[];
}

export interface StepOption {
  id: string;
  stepId: string;
  content?: string | null;
  assetUrl?: string | null;
  metadata?: StepOptionMetadata | null;
  isSelected: boolean;
  sortOrder: number;
  createdAt: Date | string;
  // Relations
  step?: ProjectStep;
}

// ==================== AI Config Types ====================

export interface AIModelConfig {
  id: string;
  tenantId?: string | null;
  userId?: string | null;
  modelType: AIModelType;
  providerName: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: Record<string, unknown> | null;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PromptTemplate {
  id: string;
  tenantId?: string | null;
  userId?: string | null;
  templateType: TemplateType;
  name: string;
  description?: string | null;
  category?: string | null;
  promptContent: string;
  variables?: PromptVariable[] | null;
  isSystem: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIUsageLog {
  id: string;
  tenantId?: string | null;
  userId: string;
  projectId?: string | null;
  modelType: AIModelType;
  modelConfigId: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cost?: number | null;
  latencyMs?: number | null;
  status: AILogStatus;
  errorMessage?: string | null;
  createdAt: Date | string;
}

// ==================== Attribute Types ====================

export interface CopywritingAttributes {
  perspective?: string;  // 叙事视角：第一人称/第二人称/第三人称
  role?: string;         // 角色设定：朋友/专家/老师等
  gender?: string;       // 性别：男/女/中性
  age?: string;          // 年龄：少年/青年/中年/老年
  purpose?: string;      // 内容目的：种草/科普/讲故事等
  emotion?: string;      // 情绪风格：轻松/严肃/温馨等
  style?: string;        // 内容风格：幽默/专业/口语化等
  duration?: string;     // 时长：15秒/30秒/60秒/90秒
  audience?: string;     // 目标受众：年轻人/职场人/学生等
}

export interface StepOptionMetadata {
  prompt?: string;
  modelUsed?: string;
  generationParams?: Record<string, unknown>;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  [key: string]: unknown;
}

export interface PromptVariable {
  name: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

// ==================== API Request Types ====================

export interface CreateProjectRequest {
  topic: string;
  title?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  status?: ProjectStatus;
  currentVersionId?: string;
  coverUrl?: string;
  finalVideoUrl?: string;
  isPublic?: boolean;
}

export interface CreateVersionRequest {
  parentVersionId?: string;
  branchName?: string;
}

export interface UpdateStepRequest {
  selectedOptionId?: string;
  attributes?: CopywritingAttributes;
  status?: StepStatus;
}

// ==================== API Response Types ====================

export interface ProjectListResponse {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProjectDetailResponse extends Project {
  versions: ProjectVersion[];
  currentVersion: ProjectVersion & {
    steps: (ProjectStep & {
      options: StepOption[];
    })[];
  };
}

// ==================== Query Types ====================

export interface ProjectListQuery {
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// ==================== Step Flow Types ====================

export const STEP_ORDER: StepType[] = [
  'TOPIC_INPUT',
  'TITLE_GENERATE',
  'TITLE_SELECT',
  'ATTRIBUTE_SET',
  'COPY_GENERATE',
  'COPY_SELECT',
  'COPY_SEGMENT',
  'IMAGE_GENERATE',
  'IMAGE_SELECT',
  'VIDEO_GENERATE',
  'VIDEO_SELECT',
  'VOICE_CONFIG',
  'VOICE_GENERATE',
  'COMPOSE',
];

export const STEP_LABELS: Record<StepType, string> = {
  TOPIC_INPUT: '主题输入',
  TITLE_GENERATE: '标题生成',
  TITLE_SELECT: '标题选择',
  ATTRIBUTE_SET: '文案属性',
  COPY_GENERATE: '文案生成',
  COPY_SELECT: '文案选择',
  COPY_SEGMENT: '文案分段',
  IMAGE_GENERATE: '图片生成',
  IMAGE_SELECT: '图片选择',
  VIDEO_GENERATE: '视频生成',
  VIDEO_SELECT: '视频选择',
  VOICE_CONFIG: '配音配置',
  VOICE_GENERATE: '配音生成',
  COMPOSE: '最终合成',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: '草稿',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
  ARCHIVED: '已归档',
};

// ==================== Route Step Mapping ====================

// 简化的步骤类型（用于路由）
export type RouteStep = 'topic' | 'title' | 'attributes' | 'copy' | 'images' | 'videos' | 'voice' | 'compose';

// 路由步骤到数据库步骤的映射
export const ROUTE_TO_STEP: Record<RouteStep, StepType> = {
  topic: 'TOPIC_INPUT',
  title: 'TITLE_SELECT',
  attributes: 'ATTRIBUTE_SET',
  copy: 'COPY_SELECT',
  images: 'IMAGE_SELECT',
  videos: 'VIDEO_SELECT',
  voice: 'VOICE_CONFIG',
  compose: 'COMPOSE',
};

// 数据库步骤到路由步骤的映射
export const STEP_TO_ROUTE: Partial<Record<StepType, RouteStep>> = {
  TOPIC_INPUT: 'topic',
  TITLE_SELECT: 'title',
  ATTRIBUTE_SET: 'attributes',
  COPY_SELECT: 'copy',
  IMAGE_SELECT: 'images',
  VIDEO_SELECT: 'videos',
  VOICE_CONFIG: 'voice',
  COMPOSE: 'compose',
};

// 路由步骤顺序
export const ROUTE_STEP_ORDER: RouteStep[] = [
  'topic',
  'title',
  'attributes',
  'copy',
  'images',
  'videos',
  'voice',
  'compose',
];

// 路由步骤标签
export const ROUTE_STEP_LABELS: Record<RouteStep, string> = {
  topic: '主题',
  title: '标题',
  attributes: '属性',
  copy: '文案',
  images: '图片',
  videos: '视频',
  voice: '配音',
  compose: '合成',
};

// 获取步骤索引
export function getRouteStepIndex(step: RouteStep): number {
  return ROUTE_STEP_ORDER.indexOf(step);
}

// 获取下一个步骤
export function getNextRouteStep(currentStep: RouteStep): RouteStep | null {
  const index = getRouteStepIndex(currentStep);
  if (index === -1 || index >= ROUTE_STEP_ORDER.length - 1) return null;
  return ROUTE_STEP_ORDER[index + 1];
}

// ==================== Project Page Response ====================

// 标题选项
export interface TitleOption {
  id: string;
  content: string;
}

// 文案选项
export interface CopyOption {
  id: string;
  content: string;
}

// 图片选项
export interface ImageOption {
  id: string;
  imageUrl: string;
}

// 视频选项
export interface VideoOption {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
}

// 配音配置
export interface VoiceConfigData {
  voiceId: string;
  speed: number;
  pitch: number;
}

// 项目页面响应（用于 SWR）
export interface ProjectPageResponse {
  id: string;
  topic: string;
  title: string | null;
  status: ProjectStatus;
  currentStep: StepType;
  currentVersion: {
    id: string;
    versionNo: number;
  };
  steps: {
    topic: { value: string } | null;
    titles: { options: TitleOption[]; selectedId: string | null } | null;
    attributes: CopywritingAttributes | null;
    copies: { options: CopyOption[]; selectedId: string | null } | null;
    images: { options: ImageOption[]; selectedIds: string[] } | null;
    videos: { options: VideoOption[]; selectedIds: string[] } | null;
    voice: VoiceConfigData | null;
    compose: { videoUrl: string | null; progress: number } | null;
  };
}
