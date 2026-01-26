"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Eye, EyeOff, Type, ImageIcon, Video, Mic, Copy } from "lucide-react";
import { toast } from "sonner";

interface AIModelConfig {
  id: string;
  modelType: "TEXT" | "IMAGE" | "VIDEO" | "VOICE";
  providerName: string;
  apiUrl: string;
  apiKey: string;
  modelName: string;
  config?: Record<string, unknown>;
  isDefault: boolean;
  isActive: boolean;
  priority: number;
}

const MODEL_TYPE_LABELS: Record<string, string> = {
  TEXT: "文本生成",
  IMAGE: "图片生成",
  VIDEO: "视频生成",
  VOICE: "语音生成",
};

const MODEL_TYPE_ICONS: Record<string, React.ReactNode> = {
  TEXT: <Type className="h-4 w-4" />,
  IMAGE: <ImageIcon className="h-4 w-4" />,
  VIDEO: <Video className="h-4 w-4" />,
  VOICE: <Mic className="h-4 w-4" />,
};

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AIModelConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    modelType: "TEXT" as AIModelConfig["modelType"],
    providerName: "",
    apiUrl: "",
    apiKey: "",
    modelName: "",
    config: "",
    isDefault: false,
    isActive: true,
    priority: 0,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/admin/ai-config");
      const data = await res.json();
      setConfigs(data.data || []);
    } catch {
      toast.error("获取配置失败");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingConfig(null);
    setFormData({
      modelType: "TEXT",
      providerName: "",
      apiUrl: "",
      apiKey: "",
      modelName: "",
      config: "",
      isDefault: false,
      isActive: true,
      priority: 0,
    });
    setDialogOpen(true);
  }

  function openEditDialog(config: AIModelConfig) {
    setEditingConfig(config);
    setFormData({
      modelType: config.modelType,
      providerName: config.providerName,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      modelName: config.modelName,
      config: config.config ? JSON.stringify(config.config, null, 2) : "",
      isDefault: config.isDefault,
      isActive: config.isActive,
      priority: config.priority,
    });
    setDialogOpen(true);
  }

  function openCopyDialog(config: AIModelConfig) {
    setEditingConfig(null);
    setFormData({
      modelType: config.modelType,
      providerName: config.providerName,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      modelName: "",
      config: config.config ? JSON.stringify(config.config, null, 2) : "",
      isDefault: false,
      isActive: true,
      priority: config.priority,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const configJson = formData.config ? JSON.parse(formData.config) : null;
      const payload = { ...formData, config: configJson };

      if (editingConfig) {
        await fetch(`/api/admin/ai-config/${editingConfig.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("更新成功");
      } else {
        await fetch("/api/admin/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("创建成功");
      }
      setDialogOpen(false);
      fetchConfigs();
    } catch {
      toast.error("操作失败");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此配置吗？")) return;
    try {
      await fetch(`/api/admin/ai-config/${id}`, { method: "DELETE" });
      toast.success("删除成功");
      fetchConfigs();
    } catch {
      toast.error("删除失败");
    }
  }

  function maskApiKey(key: string) {
    if (key.length <= 8) return "****";
    return key.slice(0, 4) + "****" + key.slice(-4);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI 模型配置" />
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-32" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 模型配置"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新增配置
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模型类型</TableHead>
              <TableHead>提供商</TableHead>
              <TableHead>模型名称</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>优先级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  暂无配置，点击"新增配置"添加
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {MODEL_TYPE_LABELS[config.modelType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{config.providerName}</TableCell>
                  <TableCell>{config.modelName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {showApiKey[config.id] ? config.apiKey : maskApiKey(config.apiKey)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowApiKey(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                      >
                        {showApiKey[config.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{config.priority}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {config.isDefault && <Badge>默认</Badge>}
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? "启用" : "禁用"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openCopyDialog(config)} title="复制配置">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(config)} title="编辑">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)} title="删除">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingConfig ? "编辑配置" : "新增配置"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>模型类型</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["TEXT", "IMAGE", "VIDEO", "VOICE"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={!!editingConfig}
                    onClick={() => setFormData({ ...formData, modelType: type })}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-colors cursor-pointer",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      formData.modelType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent hover:text-accent-foreground border-input",
                      editingConfig && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {MODEL_TYPE_ICONS[type]}
                    {MODEL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>提供商名称</Label>
              <Input
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                placeholder="如：OpenAI、通义千问"
              />
            </div>
            <div className="grid gap-2">
              <Label>API 地址</Label>
              <Input
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="grid gap-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div className="grid gap-2">
              <Label>模型名称</Label>
              <Input
                value={formData.modelName}
                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>
            <div className="grid gap-2">
              <Label>额外配置 (JSON)</Label>
              <Textarea
                value={formData.config}
                onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                placeholder='{"temperature": 0.7}'
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>优先级</Label>
              <Input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>设为默认</Label>
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(v) => setFormData({ ...formData, isDefault: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>启用状态</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingConfig ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
