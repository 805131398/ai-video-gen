"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Type, ImageIcon, Video, Mic, HelpCircle } from "lucide-react";
import { toast } from "sonner";

type AIModelType = "TEXT" | "IMAGE" | "VIDEO" | "VOICE";
type APIFormat = "openai" | "anthropic" | "qwen" | "zhipu" | "baidu" | "custom";
type ImageProvider = "openai" | "stability" | "qwen-image" | "zhipu-image" | "fal" | "bltcy" | "custom";
type VideoProvider = "sora" | "runway" | "kling" | "zhipu-video" | "fal-video" | "bltcy" | "toapis" | "wan2.6" | "custom";
type VoiceProvider = "openai-tts" | "elevenlabs" | "azure-tts" | "aliyun-tts" | "minimax-tts" | "custom";

interface ModelConfigOptions {
  apiFormat?: APIFormat;
  endpoint?: string;
  responsePath?: string;
  defaultParams?: {
    temperature?: number;
    maxTokens?: number;
  };
  provider?: ImageProvider | VideoProvider | VoiceProvider;
  defaultSize?: string;
  defaultN?: number;
  responseFormat?: "url" | "b64_json";
  defaultDuration?: number;
  defaultResolution?: string;
  defaultAspectRatio?: string;
  pollInterval?: number;
  defaultVoice?: string;
  defaultSpeed?: number;
  outputFormat?: string;
}

const MODEL_TYPE_LABELS: Record<AIModelType, string> = {
  TEXT: "文本生成",
  IMAGE: "图片生成",
  VIDEO: "视频生成",
  VOICE: "语音生成",
};

const MODEL_TYPE_ICONS: Record<AIModelType, React.ReactNode> = {
  TEXT: <Type className="h-4 w-4" />,
  IMAGE: <ImageIcon className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  VOICE: <Mic className="h-4 w-4" />,
};

const API_FORMAT_LABELS: Record<APIFormat, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic (Claude)",
  qwen: "通义千问",
  zhipu: "智谱 AI",
  baidu: "百度文心",
  custom: "自定义",
};

const IMAGE_PROVIDER_LABELS: Record<ImageProvider, string> = {
  openai: "DALL-E (OpenAI)",
  stability: "Stable Diffusion",
  "qwen-image": "通义万相",
  "zhipu-image": "智谱 CogView",
  fal: "fal.ai",
  bltcy: "bltcy",
  custom: "自定义",
};

const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  sora: "Sora (OpenAI)",
  runway: "Runway",
  pika: "Pika Labs",
  kling: "可灵 (快手)",
  minimax: "MiniMax",
  "zhipu-video": "智谱 CogVideo",
  "fal-video": "fal.ai",
  bltcy: "bltcy",
  toapis: "toapis Sora2",
  "wan2.6": "阿里云万相 Wan2.6",
  custom: "自定义",
};

const VOICE_PROVIDER_LABELS: Record<VoiceProvider, string> = {
  "openai-tts": "OpenAI TTS",
  elevenlabs: "ElevenLabs",
  "azure-tts": "Azure TTS",
  "aliyun-tts": "阿里云 TTS",
  "minimax-tts": "MiniMax TTS",
  custom: "自定义",
};

interface FormData {
  modelType: AIModelType;
  providerName: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config: ModelConfigOptions;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
}

const EMPTY_FORM: FormData = {
  modelType: "TEXT",
  providerName: "",
  apiUrl: "",
  apiKey: "",
  modelName: "",
  config: { apiFormat: "openai" },
  isDefault: false,
  isActive: true,
  priority: 0,
};

// 带提示的 Label 组件
function LabelWithTooltip({
  htmlFor,
  children,
  tooltip
}: {
  htmlFor?: string;
  children: React.ReactNode;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px]">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// Chip 选择器组件
function ChipSelector<T extends string>({
  value,
  onChange,
  options,
  labels,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  labels: Record<T, string>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
            value === option
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-accent hover:text-accent-foreground border-input hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AIConfigEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = id === "new";
  const copyFromId = searchParams.get("copyFrom");

  const [loading, setLoading] = useState(!isNew || !!copyFromId);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    async function fetchConfig(configId: string, isCopy = false) {
      try {
        const res = await fetch(`/api/admin/ai-config/${configId}`);
        if (!res.ok) throw new Error("获取配置失败");
        const data = await res.json();
        const config = data.data;
        setFormData({
          modelType: config.modelType,
          providerName: config.providerName,
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          modelName: isCopy ? "" : config.modelName, // 复制时清空模型名称
          config: config.config || { apiFormat: "openai" },
          isDefault: isCopy ? false : config.isDefault, // 复制时不设为默认
          isActive: config.isActive,
          priority: config.priority,
        });
      } catch {
        toast.error("获取配置失败");
        router.push("/admin/ai-config");
      } finally {
        setLoading(false);
      }
    }

    if (!isNew) {
      fetchConfig(id);
    } else if (copyFromId) {
      // 复制模式：加载源配置
      fetchConfig(copyFromId, true);
    }
  }, [id, isNew, copyFromId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        config: Object.keys(formData.config).length > 0 ? formData.config : null,
      };

      if (isNew) {
        const res = await fetch("/api/admin/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("创建失败");
        toast.success("创建成功");
      } else {
        const res = await fetch(`/api/admin/ai-config/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("更新失败");
        toast.success("更新成功");
      }
      router.push("/admin/ai-config");
    } catch {
      toast.error(isNew ? "创建失败" : "更新失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? (copyFromId ? "复制 AI 配置" : "新增 AI 配置") : "编辑 AI 配置"}
        description={isNew ? (copyFromId ? "基于现有配置创建新配置" : "添加新的 AI 模型配置") : `编辑配置：${formData.providerName} - ${formData.modelName}`}
        actions={
          <Button variant="outline" onClick={() => router.push("/admin/ai-config")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 模型类型 Tab */}
        <div className="flex items-center gap-1 border-b">
          {(["TEXT", "IMAGE", "VIDEO", "VOICE"] as const).map((type) => (
            <button
              key={type}
              type="button"
              disabled={!isNew}
              onClick={() => setFormData({ ...formData, modelType: type, config: {} })}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                formData.modelType === type
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                !isNew && "opacity-60 cursor-not-allowed"
              )}
            >
              {MODEL_TYPE_ICONS[type]}
              {MODEL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">基本信息</CardTitle>
            <CardDescription>配置 AI 模型的基本连接信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="providerName" tooltip="AI 服务提供商的名称，用于在列表中识别不同的配置">
                  提供商名称 *
                </LabelWithTooltip>
                <Input
                  id="providerName"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  placeholder="如：OpenAI、Claude、通义千问"
                  required
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="modelName" tooltip="具体的模型标识符，调用 API 时会使用此名称">
                  模型名称 *
                </LabelWithTooltip>
                <Input
                  id="modelName"
                  value={formData.modelName}
                  onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                  placeholder="如：gpt-4o-mini、claude-3-opus"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <LabelWithTooltip htmlFor="apiUrl" tooltip="AI 服务的完整 API 端点地址，包含协议和路径">
                API 地址 *
              </LabelWithTooltip>
              <Input
                id="apiUrl"
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="apiKey" tooltip="用于身份验证的 API 密钥，请妥善保管">
                  API Key *
                </LabelWithTooltip>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  required
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip htmlFor="priority" tooltip="数值越大优先级越高，同类型模型中优先使用高优先级配置">
                  优先级
                </LabelWithTooltip>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-8 pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
                />
                <Label htmlFor="isDefault" className="cursor-pointer">设为默认</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                />
                <Label htmlFor="isActive" className="cursor-pointer">启用配置</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 高级配置 - TEXT */}
        {formData.modelType === "TEXT" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">文本生成配置</CardTitle>
              <CardDescription>配置文本生成模型的高级参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <LabelWithTooltip tooltip="不同 AI 服务商的 API 请求/响应格式可能不同，选择对应的格式以确保正确解析">
                  API 格式
                </LabelWithTooltip>
                <ChipSelector
                  value={(formData.config.apiFormat as APIFormat) || "openai"}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, apiFormat: value },
                    })
                  }
                  options={Object.keys(API_FORMAT_LABELS) as APIFormat[]}
                  labels={API_FORMAT_LABELS}
                />
                <p className="text-xs text-muted-foreground">大多数国产模型都提供 OpenAI 兼容接口</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="控制输出的随机性，0 表示确定性输出，2 表示最大随机性">
                    Temperature
                  </LabelWithTooltip>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.config.defaultParams?.temperature ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          defaultParams: {
                            ...formData.config.defaultParams,
                            temperature: e.target.value ? parseFloat(e.target.value) : undefined,
                          },
                        },
                      })
                    }
                    placeholder="0.7"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="限制模型生成的最大 token 数量，防止输出过长">
                    Max Tokens
                  </LabelWithTooltip>
                  <Input
                    type="number"
                    min="1"
                    value={formData.config.defaultParams?.maxTokens ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          defaultParams: {
                            ...formData.config.defaultParams,
                            maxTokens: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        },
                      })
                    }
                    placeholder="2000"
                  />
                </div>
              </div>
              {formData.config.apiFormat === "custom" && (
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="自定义 API 响应中提取内容的 JSON 路径，如 choices[0].message.content">
                    响应解析路径
                  </LabelWithTooltip>
                  <Input
                    value={formData.config.responsePath || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, responsePath: e.target.value },
                      })
                    }
                    placeholder="choices[0].message.content"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 高级配置 - IMAGE */}
        {formData.modelType === "IMAGE" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">图片生成配置</CardTitle>
              <CardDescription>配置图片生成模型的高级参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <LabelWithTooltip tooltip="选择图片生成服务商，不同服务商的 API 格式和参数可能不同">
                  图片服务商
                </LabelWithTooltip>
                <ChipSelector
                  value={(formData.config.provider as ImageProvider) || "openai"}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, provider: value },
                    })
                  }
                  options={Object.keys(IMAGE_PROVIDER_LABELS) as ImageProvider[]}
                  labels={IMAGE_PROVIDER_LABELS}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="生成图片的默认分辨率，可在调用时覆盖">
                    默认尺寸
                  </LabelWithTooltip>
                  <Select
                    value={formData.config.defaultSize || "1024x1024"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, defaultSize: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="256x256">256x256</SelectItem>
                      <SelectItem value="512x512">512x512</SelectItem>
                      <SelectItem value="1024x1024">1024x1024</SelectItem>
                      <SelectItem value="1024x1792">1024x1792 (竖版)</SelectItem>
                      <SelectItem value="1792x1024">1792x1024 (横版)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="每次请求默认生成的图片数量">
                    默认数量
                  </LabelWithTooltip>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.config.defaultN ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          defaultN: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="URL 返回图片链接，Base64 返回编码数据（适合需要直接处理图片的场景）">
                    响应格式
                  </LabelWithTooltip>
                  <Select
                    value={formData.config.responseFormat || "url"}
                    onValueChange={(value: "url" | "b64_json") =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, responseFormat: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL 链接</SelectItem>
                      <SelectItem value="b64_json">Base64 编码</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 高级配置 - VIDEO */}
        {formData.modelType === "VIDEO" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">视频生成配置</CardTitle>
              <CardDescription>配置视频生成模型的高级参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <LabelWithTooltip tooltip="选择视频生成服务商，不同服务商支持的参数和生成效果不同">
                  视频服务商
                </LabelWithTooltip>
                <ChipSelector
                  value={(formData.config.provider as VideoProvider) || "sora"}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, provider: value },
                    })
                  }
                  options={Object.keys(VIDEO_PROVIDER_LABELS) as VideoProvider[]}
                  labels={VIDEO_PROVIDER_LABELS}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="生成视频的默认时长，单位为秒">
                    默认时长(秒)
                  </LabelWithTooltip>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.config.defaultDuration ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          defaultDuration: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="5"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="视频的清晰度，更高分辨率需要更长生成时间">
                    默认分辨率
                  </LabelWithTooltip>
                  <Select
                    value={formData.config.defaultResolution || "1080p"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, defaultResolution: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p</SelectItem>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="4k">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="视频画面的宽高比例，横版适合电脑，竖版适合手机">
                    默认宽高比
                  </LabelWithTooltip>
                  <Select
                    value={formData.config.defaultAspectRatio || "16:9"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, defaultAspectRatio: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (横版)</SelectItem>
                      <SelectItem value="9:16">9:16 (竖版)</SelectItem>
                      <SelectItem value="1:1">1:1 (方形)</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="视频生成是异步的，此参数控制检查生成状态的时间间隔">
                    轮询间隔(秒)
                  </LabelWithTooltip>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.config.pollInterval ? formData.config.pollInterval / 1000 : ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          pollInterval: e.target.value ? parseInt(e.target.value) * 1000 : undefined,
                        },
                      })
                    }
                    placeholder="5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 高级配置 - VOICE */}
        {formData.modelType === "VOICE" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">语音合成配置</CardTitle>
              <CardDescription>配置语音合成模型的高级参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <LabelWithTooltip tooltip="选择语音合成服务商，不同服务商提供的音色和效果不同">
                  语音服务商
                </LabelWithTooltip>
                <ChipSelector
                  value={(formData.config.provider as VoiceProvider) || "openai-tts"}
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, provider: value },
                    })
                  }
                  options={Object.keys(VOICE_PROVIDER_LABELS) as VoiceProvider[]}
                  labels={VOICE_PROVIDER_LABELS}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="语音的音色标识，不同服务商支持的音色不同，如 OpenAI 支持 alloy, echo, fable 等">
                    默认音色
                  </LabelWithTooltip>
                  <Input
                    value={formData.config.defaultVoice || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, defaultVoice: e.target.value },
                      })
                    }
                    placeholder="alloy"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="语音播放速度，1.0 为正常速度，小于 1 变慢，大于 1 变快">
                    默认语速
                  </LabelWithTooltip>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.25"
                    max="4"
                    value={formData.config.defaultSpeed ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          defaultSpeed: e.target.value ? parseFloat(e.target.value) : undefined,
                        },
                      })
                    }
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <LabelWithTooltip tooltip="生成音频的文件格式，MP3 兼容性最好，WAV 质量最高">
                    输出格式
                  </LabelWithTooltip>
                  <Select
                    value={formData.config.outputFormat || "mp3"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        config: { ...formData.config, outputFormat: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                      <SelectItem value="ogg">OGG</SelectItem>
                      <SelectItem value="pcm">PCM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/ai-config")}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isNew ? "创建配置" : "保存修改"}
          </Button>
        </div>
      </form>
    </div>
  );
}