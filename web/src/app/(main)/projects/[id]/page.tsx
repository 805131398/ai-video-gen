"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VersionTree } from "@/components/projects";
import {
  ArrowLeft,
  Play,
  Download,
  Share2,
  Edit2,
  Save,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Version {
  id: string;
  versionNo: number;
  branchName?: string | null;
  isMain: boolean;
  currentStep: string;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  topic: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  coverUrl?: string | null;
  finalVideoUrl?: string | null;
  currentVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: Version[];
}

const statusConfig = {
  DRAFT: { label: "草稿", variant: "secondary" as const },
  IN_PROGRESS: { label: "进行中", variant: "default" as const },
  COMPLETED: { label: "已完成", variant: "default" as const },
  ARCHIVED: { label: "已归档", variant: "outline" as const },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    fetchProject();
    fetchVersions();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setEditTitle(data.title);
      } else {
        toast.error("作品不存在");
        router.push("/projects");
      }
    } catch {
      toast.error("获取作品失败");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch {
      console.error("Failed to fetch versions");
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        setProject((prev) => (prev ? { ...prev, title: editTitle } : null));
        setIsEditing(false);
        toast.success("保存成功");
      }
    } catch {
      toast.error("保存失败");
    }
  };

  const handleVersionSelect = async (versionId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentVersionId: versionId }),
      });
      if (res.ok) {
        setProject((prev) =>
          prev ? { ...prev, currentVersionId: versionId } : null
        );
        toast.success("已切换版本");
      }
    } catch {
      toast.error("切换版本失败");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  const statusInfo = statusConfig[project.status];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="max-w-md"
              />
              <Button size="sm" onClick={handleSaveTitle}>
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(false)}
              >
                取消
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-800">
                {project.title}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          )}
          <p className="text-slate-500 mt-1">主题: {project.topic}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content - Video Preview */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
              {project.finalVideoUrl ? (
                <video
                  src={project.finalVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>视频尚未生成</p>
                </div>
              )}
            </div>

            {/* Video Actions */}
            {project.finalVideoUrl && (
              <div className="p-4 border-t flex items-center justify-end gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  分享
                </Button>
              </div>
            )}
          </Card>

          {/* Project Info */}
          <Card className="mt-6 p-6">
            <h3 className="font-medium text-slate-800 mb-4">作品信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">创建时间</span>
                <p className="text-slate-800">
                  {new Date(project.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <div>
                <span className="text-slate-500">更新时间</span>
                <p className="text-slate-800">
                  {new Date(project.updatedAt).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - Version History */}
        <div className="space-y-6">
          <Card className="p-4">
            <VersionTree
              versions={versions}
              currentVersionId={project.currentVersionId || ""}
              onVersionSelect={handleVersionSelect}
            />
            {versions.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                暂无版本记录
              </p>
            )}
          </Card>

          {/* Create Branch Button */}
          <Button variant="outline" className="w-full">
            <GitBranch className="w-4 h-4 mr-2" />
            创建新分支
          </Button>
        </div>
      </div>
    </div>
  );
}