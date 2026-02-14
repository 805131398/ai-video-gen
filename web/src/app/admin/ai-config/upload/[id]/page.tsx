"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, LabelWithTooltip, ChipSelector } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AuthType = "bearer" | "api-key" | "custom";

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  bearer: "Bearer Token",
  "api-key": "API Key",
  custom: "自定义",
};

interface FormData {
  providerName: string;
  displayName: string;
  uploadUrl: string;
  authType: AuthType;
  apiKey: string;
  responseUrlPath: string;
  config: {
    fileFieldName?: string;
    extraHeaders?: string;
  };
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  providerName: "",
  displayName: "",
  uploadUrl: "",
  authType: "bearer",
  apiKey: "",
  responseUrlPath: "data.url",
  config: { fileFieldName: "file" },
  isActive: true,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UploadConfigEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

  useEffect(() => {
    if (!isNew) {
      fetchConfig();
    }
  }, [id, isNew]);

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/admin/upload-configs/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const config = data.data;
      setFormData({
        providerName: config.providerName,
        displayName: config.displayName,
        uploadUrl: config.uploadUrl,
        authType: config.authType as AuthType,
        apiKey: config.apiKey,
        responseUrlPath: config.responseUrlPath,
        config: config.config || { fileFieldName: "file" },
        isActive: config.isActive,
      });
    } catch {
      toast.error("获取配置失败");
      router.push("/admin/ai-config");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        config: Object.keys(formData.config).length > 0 ? formData.config : null,
      };

      if (isNew) {
        const res = await fetch("/api/admin/upload-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        toast.success("创建成功");
      } else {
        const res = await fetch(`/api/admin/upload-configs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
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
        title={isNew ? "新增图片上传配置" : "编辑图片上传配置"}
        description={
          isNew
            ? "配置 AI 供应商的图片上传接口"
            : `编辑配置：${formData.displayName}`
        }
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/ai-config")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">基本信息</CardTitle>
            <CardDescription>
              配置供应商的图片上传接口信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip
                  htmlFor="providerName"
                  tooltip="小写英文标识，需与 AI 模型配置中的供应商名称一致，用于自动匹配"
                >
                  供应商标识 *
                </LabelWithTooltip>
                <Input
                  id="providerName"
                  value={formData.providerName}
                  onChange={(e) =>
                    setFormData({ ...formData, providerName: e.target.value })
                  }
                  placeholder="如：toapis、kling、runway"
                  required
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip
                  htmlFor="displayName"
                  tooltip="在管理界面中显示的名称，方便识别"
                >
                  显示名称 *
                </LabelWithTooltip>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="如：ToAPIs 图片上传"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <LabelWithTooltip
                htmlFor="uploadUrl"
                tooltip="供应商的图片上传接口完整地址，包含协议和路径"
              >
                上传地址 *
              </LabelWithTooltip>
              <Input
                id="uploadUrl"
                value={formData.uploadUrl}
                onChange={(e) =>
                  setFormData({ ...formData, uploadUrl: e.target.value })
                }
                placeholder="https://toapis.com/v1/uploads/images"
                required
              />
            </div>

            <div className="space-y-3">
              <LabelWithTooltip tooltip="不同供应商使用不同的认证方式，Bearer Token 最常见">
                认证方式 *
              </LabelWithTooltip>
              <ChipSelector
                value={formData.authType}
                onChange={(value) =>
                  setFormData({ ...formData, authType: value })
                }
                options={Object.keys(AUTH_TYPE_LABELS) as AuthType[]}
                labels={AUTH_TYPE_LABELS}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip
                  htmlFor="apiKey"
                  tooltip="用于供应商接口认证的 API 密钥，加密存储"
                >
                  API Key *
                </LabelWithTooltip>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  required
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip
                  htmlFor="responseUrlPath"
                  tooltip="用点号分隔的 JSON 路径，从上传响应中提取图片 URL。如 data.url 表示取 response.data.url"
                >
                  响应 URL 路径 *
                </LabelWithTooltip>
                <Input
                  id="responseUrlPath"
                  value={formData.responseUrlPath}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      responseUrlPath: e.target.value,
                    })
                  }
                  placeholder="data.url"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, isActive: v })
                }
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                启用配置
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* 高级配置 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">高级配置</CardTitle>
            <CardDescription>大多数情况下保持默认即可</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <LabelWithTooltip
                  htmlFor="fileFieldName"
                  tooltip="上传表单中文件字段的名称，大多数接口使用 file"
                >
                  文件字段名
                </LabelWithTooltip>
                <Input
                  id="fileFieldName"
                  value={formData.config.fileFieldName || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        fileFieldName: e.target.value,
                      },
                    })
                  }
                  placeholder="file"
                />
              </div>
              <div className="space-y-2">
                <LabelWithTooltip
                  htmlFor="extraHeaders"
                  tooltip='JSON 格式的额外 HTTP 请求头，如 {"X-Custom": "value"}'
                >
                  额外 Headers
                </LabelWithTooltip>
                <Input
                  id="extraHeaders"
                  value={formData.config.extraHeaders || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        extraHeaders: e.target.value,
                      },
                    })
                  }
                  placeholder='{"X-Custom": "value"}'
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
