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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

interface PromptTemplate {
  id: string;
  templateType: "TITLE" | "COPYWRITING" | "IMAGE";
  name: string;
  description?: string;
  category?: string;
  promptContent: string;
  variables?: { name: string; description?: string }[];
  isSystem: boolean;
  isActive: boolean;
  usageCount: number;
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  TITLE: "标题生成",
  COPYWRITING: "文案生成",
  IMAGE: "图片生成",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    templateType: "TITLE" as PromptTemplate["templateType"],
    name: "",
    description: "",
    category: "",
    promptContent: "",
    variables: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/admin/templates");
      const data = await res.json();
      setTemplates(data.data || []);
    } catch {
      toast.error("获取模板失败");
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingTemplate(null);
    setFormData({
      templateType: "TITLE",
      name: "",
      description: "",
      category: "",
      promptContent: "",
      variables: "",
      isActive: true,
    });
    setDialogOpen(true);
  }

  function openEditDialog(template: PromptTemplate) {
    setEditingTemplate(template);
    setFormData({
      templateType: template.templateType,
      name: template.name,
      description: template.description || "",
      category: template.category || "",
      promptContent: template.promptContent,
      variables: template.variables ? JSON.stringify(template.variables, null, 2) : "",
      isActive: template.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    try {
      const variablesJson = formData.variables ? JSON.parse(formData.variables) : null;
      const payload = { ...formData, variables: variablesJson };

      if (editingTemplate) {
        await fetch(`/api/admin/templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("更新成功");
      } else {
        await fetch("/api/admin/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("创建成功");
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch {
      toast.error("操作失败");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除此模板吗？")) return;
    try {
      await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      toast.success("删除成功");
      fetchTemplates();
    } catch {
      toast.error("删除失败");
    }
  }

  function copyPrompt(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("已复制到剪贴板");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="提示词模板" />
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
        title="提示词模板"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            新增模板
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模板类型</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>使用次数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无模板，点击"新增模板"添加
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {TEMPLATE_TYPE_LABELS[template.templateType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{template.category || "-"}</TableCell>
                  <TableCell>{template.usageCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {template.isSystem && <Badge variant="secondary">系统</Badge>}
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "启用" : "禁用"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => copyPrompt(template.promptContent)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                        disabled={template.isSystem}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                        disabled={template.isSystem}
                      >
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
            <DialogTitle>{editingTemplate ? "编辑模板" : "新增模板"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label>模板类型</Label>
              <Select
                value={formData.templateType}
                onValueChange={(v) => setFormData({ ...formData, templateType: v as PromptTemplate["templateType"] })}
                disabled={!!editingTemplate}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TITLE">标题生成</SelectItem>
                  <SelectItem value="COPYWRITING">文案生成</SelectItem>
                  <SelectItem value="IMAGE">图片生成</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>模板名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：种草文案模板"
              />
            </div>
            <div className="grid gap-2">
              <Label>描述</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="模板用途说明"
              />
            </div>
            <div className="grid gap-2">
              <Label>分类</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="如：电商、生活、科技"
              />
            </div>
            <div className="grid gap-2">
              <Label>提示词内容</Label>
              <Textarea
                value={formData.promptContent}
                onChange={(e) => setFormData({ ...formData, promptContent: e.target.value })}
                placeholder="请输入提示词内容，可使用 {{变量名}} 作为占位符"
                rows={8}
              />
            </div>
            <div className="grid gap-2">
              <Label>变量定义 (JSON)</Label>
              <Textarea
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                placeholder='[{"name": "topic", "description": "主题"}]'
                rows={3}
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
              {editingTemplate ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
