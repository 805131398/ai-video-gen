"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import {
  Plus, Pencil, Trash2, Eye, EyeOff,
  Type, ImageIcon, Video, Mic, Copy,
  Settings, Upload,
} from "lucide-react";
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

interface UploadConfig {
  id: string;
  providerName: string;
  displayName: string;
  uploadUrl: string;
  authType: string;
  apiKey: string;
  responseUrlPath: string;
  config?: Record<string, unknown>;
  isActive: boolean;
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

const AUTH_TYPE_LABELS: Record<string, string> = {
  bearer: "Bearer Token",
  "api-key": "API Key",
  custom: "自定义",
};

export default function AIConfigPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"models" | "upload">("models");
  const [configs, setConfigs] = useState<AIModelConfig[]>([]);
  const [uploadConfigs, setUploadConfigs] = useState<UploadConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === "upload" && uploadConfigs.length === 0) {
      fetchUploadConfigs();
    }
  }, [activeTab]);

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

  async function fetchUploadConfigs() {
    setUploadLoading(true);
    try {
      const res = await fetch("/api/admin/upload-configs");
      const data = await res.json();
      setUploadConfigs(data.data || []);
    } catch {
      toast.error("获取上传配置失败");
    } finally {
      setUploadLoading(false);
    }
  }

  function handleCreate() {
    router.push("/admin/ai-config/new");
  }

  function handleEdit(id: string) {
    router.push(`/admin/ai-config/${id}`);
  }

  function handleCopy(id: string) {
    router.push(`/admin/ai-config/new?copyFrom=${id}`);
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

  async function handleDeleteUpload(id: string) {
    if (!confirm("确定要删除此上传配置吗？")) return;
    try {
      await fetch(`/api/admin/upload-configs/${id}`, { method: "DELETE" });
      toast.success("删除成功");
      fetchUploadConfigs();
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
        <PageHeader title="AI 配置管理" />
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
        title="AI 配置管理"
        actions={
          activeTab === "models" ? (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新增配置
            </Button>
          ) : (
            <Button onClick={() => router.push("/admin/ai-config/upload/new")}>
              <Plus className="h-4 w-4 mr-2" />
              新增上传配置
            </Button>
          )
        }
      />

      {/* Tab 切换 */}
      <div className="flex items-center gap-1 border-b">
        <button
          type="button"
          onClick={() => setActiveTab("models")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "models"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          模型配置
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "upload"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Upload className="h-4 w-4" />
          图片上传配置
        </button>
      </div>

      {/* 模型配置列表 */}
      {activeTab === "models" && (
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
                    暂无配置，点击&quot;新增配置&quot;添加
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {MODEL_TYPE_ICONS[config.modelType]}
                        <Badge variant="outline">
                          {MODEL_TYPE_LABELS[config.modelType]}
                        </Badge>
                      </div>
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
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(config.id)} title="复制配置">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(config.id)} title="编辑">
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
      )}

      {/* 图片上传配置列表 */}
      {activeTab === "upload" && (
        uploadLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>供应商标识</TableHead>
                  <TableHead>显示名称</TableHead>
                  <TableHead>上传地址</TableHead>
                  <TableHead>认证方式</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      暂无配置，点击&quot;新增上传配置&quot;添加
                    </TableCell>
                  </TableRow>
                ) : (
                  uploadConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.providerName}</TableCell>
                      <TableCell>{config.displayName}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                          {config.uploadUrl}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{AUTH_TYPE_LABELS[config.authType] || config.authType}</Badge>
                      </TableCell>
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
                      <TableCell>
                        <Badge variant={config.isActive ? "default" : "secondary"}>
                          {config.isActive ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/ai-config/upload/${config.id}`)} title="编辑">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUpload(config.id)} title="删除">
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
        )
      )}
    </div>
  );
}
