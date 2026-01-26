"use client";

import { useState, useEffect } from "react";
import { PageHeader, Pagination } from "@/components/admin";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, Video, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Project {
  id: string;
  title: string | null;
  topic: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  coverUrl: string | null;
  finalVideoUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null };
  versions: { currentStep: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  ARCHIVED: "已归档",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "default",
  ARCHIVED: "outline",
};

export default function AIProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ status: "", search: "" });

  useEffect(() => {
    fetchProjects();
  }, [pagination.page, filters.status]);

  async function fetchProjects() {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.status) params.set("status", filters.status);

      const res = await fetch(`/api/admin/ai-projects?${params}`);
      const data = await res.json();
      setProjects(data.data || []);
      setPagination((prev) => ({ ...prev, ...data.pagination }));
    } catch {
      toast.error("获取作品列表失败");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(dateStr: string) {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhCN });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="作品管理" />
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="h-10 bg-muted rounded w-32" />
            <div className="h-10 bg-muted rounded w-48" />
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="作品管理" />

      <div className="flex gap-4">
        <Select
          value={filters.status}
          onValueChange={(v) => {
            setFilters({ ...filters, status: v });
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="DRAFT">草稿</SelectItem>
            <SelectItem value="IN_PROGRESS">进行中</SelectItem>
            <SelectItem value="COMPLETED">已完成</SelectItem>
            <SelectItem value="ARCHIVED">已归档</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="搜索作品..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-[250px]"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>作品</TableHead>
              <TableHead>创建者</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>资源</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  暂无作品
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {project.coverUrl ? (
                        <img
                          src={project.coverUrl}
                          alt=""
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <Video className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{project.title || "未命名"}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {project.topic}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {project.user.name || project.user.email || "未知用户"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[project.status]}>
                      {STATUS_LABELS[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {project.coverUrl && (
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                      {project.finalVideoUrl && (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      )}
                      {!project.coverUrl && !project.finalVideoUrl && (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTime(project.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.total}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPagination((prev) => ({ ...prev, pageSize, page: 1 }))}
        />
      )}
    </div>
  );
}
