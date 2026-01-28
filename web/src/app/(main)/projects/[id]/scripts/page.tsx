"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Edit, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Character {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface ScriptCharacter {
  character: Character;
}

interface Script {
  id: string;
  name: string;
  title: string;
  tone?: string | null;
  synopsis?: string | null;
  scriptCharacters?: ScriptCharacter[];
  scenes?: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ScriptsListPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadScripts();
  }, [projectId]);

  const loadScripts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/projects/${projectId}/scripts`);
      if (res.ok) {
        const data = await res.json();
        setScripts(data.data || []);
      }
    } catch (error) {
      console.error("加载剧本列表失败:", error);
      toast({
        title: "加载失败",
        description: "无法加载剧本列表",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!scriptToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/projects/${projectId}/scripts/${scriptToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        throw new Error("删除失败");
      }

      toast({
        title: "删除成功",
      });

      // 重新加载列表
      await loadScripts();
    } catch (error) {
      console.error("删除剧本失败:", error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除失败",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setScriptToDelete(null);
    }
  };

  const openDeleteDialog = (scriptId: string) => {
    setScriptToDelete(scriptId);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目
          </Button>
          <h1 className="text-2xl font-bold">剧本管理</h1>
        </div>
        <Button onClick={() => router.push(`/projects/${projectId}/scripts/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          创建剧本
        </Button>
      </div>

      {/* 剧本列表 */}
      {scripts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground space-y-2">
            <p className="text-lg">暂无剧本</p>
            <p className="text-sm">点击"创建剧本"开始创作</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scripts.map((script) => (
            <Card
              key={script.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() =>
                router.push(`/projects/${projectId}/scripts/${script.id}/edit`)
              }
            >
              <div className="space-y-4">
                {/* 标题和操作 */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {script.name || script.title}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/projects/${projectId}/scripts/${script.id}/edit`
                        );
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(script.id);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 基调 */}
                {script.tone && (
                  <Badge variant="secondary" className="text-xs">
                    {script.tone}
                  </Badge>
                )}

                {/* 简介 */}
                {script.synopsis && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {script.synopsis}
                  </p>
                )}

                {/* 角色和场景统计 */}
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {script.scriptCharacters &&
                      script.scriptCharacters.length > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-2">
                            {script.scriptCharacters
                              .slice(0, 3)
                              .map((sc) => (
                                <Avatar
                                  key={sc.character.id}
                                  className="w-6 h-6 border-2 border-background"
                                >
                                  <AvatarImage
                                    src={sc.character.avatarUrl || undefined}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {sc.character.name.slice(0, 1)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                          </div>
                          <span className="text-xs">
                            {script.scriptCharacters.length} 个角色
                          </span>
                        </div>
                      )}
                  </div>
                  {script.scenes && script.scenes.length > 0 && (
                    <span className="text-xs">
                      {script.scenes.length} 个场景
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个剧本吗？此操作无法撤销，剧本的所有场景也会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
