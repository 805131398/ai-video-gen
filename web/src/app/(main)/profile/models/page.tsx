"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type AIModelType = "TEXT" | "IMAGE" | "VIDEO" | "VOICE";
type APIFormat = "openai" | "anthropic" | "qwen" | "zhipu" | "baidu" | "custom";

interface ModelConfigOptions {
  apiFormat?: APIFormat;
  endpoint?: string;
  authHeader?: string;
  authPrefix?: string;
  responsePath?: string;
  defaultParams?: {
    temperature?: number;
    maxTokens?: number;
  };
}

interface ModelConfig {
  id: string;
  modelType: AIModelType;
  providerName: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: ModelConfigOptions | null;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
}

const MODEL_TYPE_LABELS: Record<AIModelType, string> = {
  TEXT: "文本生成",
  IMAGE: "图片生成",
  VIDEO: "视频生成",
  VOICE: "语音生成",
};

const MODEL_TYPE_COLORS: Record<AIModelType, string> = {
  TEXT: "bg-blue-100 text-blue-700",
  IMAGE: "bg-green-100 text-green-700",
  VIDEO: "bg-purple-100 text-purple-700",
  VOICE: "bg-orange-100 text-orange-700",
};

const API_FORMAT_LABELS: Record<APIFormat, string> = {
  openai: "OpenAI 兼容",
  anthropic: "Anthropic (Claude)",
  qwen: "通义千问",
  zhipu: "智谱 AI",
  baidu: "百度文心",
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
  config: {
    apiFormat: "openai",
  },
  isDefault: false,
  isActive: true,
  priority: 0,
};

export default function ModelsPage() {
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ModelConfig | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/profile/models");
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setConfigs(data.data || []);
    } catch (error) {
      toast.error("获取模型配置失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setFormData(EMPTY_FORM);
    setShowApiKey(false);
    setShowAdvanced(false);
    setShowDialog(true);
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingConfig(config);
    setFormData({
      modelType: config.modelType,
      providerName: config.providerName,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
      config: config.config || { apiFormat: "openai" },
      isDefault: config.isDefault,
      isActive: config.isActive,
      priority: config.priority,
    });
    setShowApiKey(false);
    setShowAdvanced(!!config.config?.apiFormat && config.config.apiFormat !== "openai");
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await fetch(`/api/profile/models/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");

      setConfigs(configs.filter((c) => c.id !== deletingId));
      toast.success("已删除");
    } catch (error) {
      toast.error("删除失败");
    } finally {
      setShowDeleteDialog(false);
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingConfig
        ? `/api/profile/models/${editingConfig.id}`
        : "/api/profile/models";
      const method = editingConfig ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }

      const data = await res.json();

      if (editingConfig) {
        setConfigs(configs.map((c) => (c.id === editingConfig.id ? data.data : c)));
      } else {
        setConfigs([...configs, data.data]);
      }

      toast.success(editingConfig ? "已更新" : "已添加");
      setShowDialog(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedConfigs = configs.reduce(
    (acc, config) => {
      if (!acc[config.modelType]) {
        acc[config.modelType] = [];
      }
      acc[config.modelType].push(config);
      return acc;
    },
    {} as Record<AIModelType, ModelConfig[]>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">模型配置</h1>
          <p className="text-sm text-slate-500 mt-1">
            配置您自己的 AI 模型，优先使用个人配置
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          添加配置
        </Button>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">暂无模型配置</p>
            <p className="text-sm text-slate-400 mt-1">
              添加您自己的 API 配置以使用自定义模型
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(MODEL_TYPE_LABELS) as AIModelType[]).map((type) => {
            const typeConfigs = groupedConfigs[type];
            if (!typeConfigs?.length) return null;

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={MODEL_TYPE_COLORS[type]}>
                      {MODEL_TYPE_LABELS[type]}
                    </Badge>
                    <span className="text-sm font-normal text-slate-500">
                      {typeConfigs.length} 个配置
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {typeConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {config.providerName}
                            </span>
                            <span className="text-sm text-slate-500">
                              {config.modelName}
                            </span>
                            {config.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                默认
                              </Badge>
                            )}
                            {!config.isActive && (
                              <Badge variant="outline" className="text-xs">
                                已禁用
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 truncate mt-1">
                            {config.apiUrl}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(config)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "编辑模型配置" : "添加模型配置"}
            </DialogTitle>
            <DialogDescription>
              配置 AI 模型的 API 信息
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="modelType">模型类型</Label>
                <Select
                  value={formData.modelType}
                  onValueChange={(value: AIModelType) =>
                    setFormData({ ...formData, modelType: value })
                  }
                  disabled={!!editingConfig}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODEL_TYPE_LABELS) as AIModelType[]).map(
                      (type) => (
                        <SelectItem key={type} value={type}>
                          {MODEL_TYPE_LABELS[type]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerName">提供商名称</Label>
                <Input
                  id="providerName"
                  value={formData.providerName}
                  onChange={(e) =>
                    setFormData({ ...formData, providerName: e.target.value })
                  }
                  placeholder="如：OpenAI、Claude、通义千问"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelName">模型名称</Label>
                <Input
                  id="modelName"
                  value={formData.modelName}
                  onChange={(e) =>
                    setFormData({ ...formData, modelName: e.target.value })
                  }
                  placeholder="如：gpt-4、claude-3-opus"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API 地址</Label>
                <Input
                  id="apiUrl"
                  value={formData.apiUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, apiUrl: e.target.value })
                  }
                  placeholder="https://api.openai.com/v1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) =>
                      setFormData({ ...formData, apiKey: e.target.value })
                    }
                    placeholder="sk-..."
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between text-slate-600"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>高级配置</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiFormat">API 格式</Label>
                    <Select
                      value={formData.config.apiFormat || "openai"}
                      onValueChange={(value: APIFormat) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, apiFormat: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(API_FORMAT_LABELS) as APIFormat[]).map(
                          (format) => (
                            <SelectItem key={format} value={format}>
                              {API_FORMAT_LABELS[format]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      大多数国产模型都提供 OpenAI 兼容接口
                    </p>
                  </div>

                  {formData.config.apiFormat === "custom" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="endpoint">API 端点路径</Label>
                        <Input
                          id="endpoint"
                          value={formData.config.endpoint || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: { ...formData.config, endpoint: e.target.value },
                            })
                          }
                          placeholder="/chat/completions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="responsePath">响应解析路径</Label>
                        <Input
                          id="responsePath"
                          value={formData.config.responsePath || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: { ...formData.config, responsePath: e.target.value },
                            })
                          }
                          placeholder="choices[0].message.content"
                        />
                        <p className="text-xs text-slate-500">
                          从响应 JSON 中提取内容的路径
                        </p>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="temperature">Temperature</Label>
                      <Input
                        id="temperature"
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
                      <Label htmlFor="maxTokens">Max Tokens</Label>
                      <Input
                        id="maxTokens"
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
                </div>
              )}

              <div className="flex items-center justify-between">\n                <div className="space-y-0.5">\n                  <Label htmlFor="isDefault">设为默认</Label>\n                  <p className="text-xs text-slate-500">
                    优先使用此配置
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isDefault: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">启用</Label>
                  <p className="text-xs text-slate-500">
                    禁用后将不会使用此配置
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，确定要删除此模型配置吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
