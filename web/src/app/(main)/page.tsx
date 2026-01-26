"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Clock,
  Video,
  Loader2,
  Wand2,
  Image,
  Film,
  ArrowRight,
  Play,
  Zap,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";

interface Project {
  id: string;
  topic: string;
  title: string | null;
  status: string;
  coverUrl: string | null;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const FEATURES = [
  { icon: Wand2, title: "AI 标题生成" },
  { icon: Sparkles, title: "智能文案创作" },
  { icon: Image, title: "AI 图片生成" },
  { icon: Film, title: "一键视频合成" },
];

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const { data: projectsData } = useSWR<{
    data: Project[];
    pagination: { total: number };
  }>("/api/projects?pageSize=3", fetcher);

  const recentProjects = projectsData?.data || [];

  const handleNewProject = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.id) {
        router.push(`/projects/${data.id}/topic`);
      }
    } catch (error) {
      console.error("创建项目失败:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-65px)] bg-slate-50 overflow-hidden p-4">
      <div className="h-full max-w-6xl mx-auto flex gap-4">
        {/* 左侧主内容 */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Hero 区域 */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white mb-1">
                  AI 视频创作工具
                </h1>
                <p className="text-sm text-blue-100/90 truncate">
                  输入主题，AI 自动生成标题、文案、图片和视频
                </p>
              </div>
              <Button
                onClick={handleNewProject}
                disabled={isCreating}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg h-10 px-5 font-medium cursor-pointer shrink-0"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    开始创作
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* 最近作品 */}
          <Card className="flex-1 p-4 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-800">最近作品</h2>
              </div>
              <Link
                href="/projects"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                全部 <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex-1 min-h-0">
              {recentProjects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Video className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-500 text-sm mb-3">暂无作品</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewProject}
                    disabled={isCreating}
                    className="cursor-pointer"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        创建第一个作品
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 h-full content-start">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group block"
                    >
                      <div className="border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                        <div className="aspect-video bg-slate-100 flex items-center justify-center">
                          {project.coverUrl ? (
                            <img
                              src={project.coverUrl}
                              alt={project.title || project.topic}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Video className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {project.title || project.topic || "未命名作品"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 右侧功能特性 */}
        <Card className="w-44 shrink-0 p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-slate-800 text-sm">功能特性</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-center gap-2.5 py-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                  <feature.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-slate-700 font-medium leading-tight">
                  {feature.title}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
