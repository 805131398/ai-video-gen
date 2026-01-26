"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Video, Loader2 } from "lucide-react";
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

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  // 获取最近项目
  const { data: projectsData } = useSWR<{
    data: Project[];
    pagination: { total: number };
  }>("/api/projects?pageSize=5", fetcher);

  const recentProjects = projectsData?.data || [];

  // 创建新项目
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 主要内容区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 欢迎卡片 */}
          <Card className="p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <h1 className="text-2xl font-bold mb-2">AI 视频创作工具</h1>
            <p className="text-blue-100 mb-6">
              输入主题，AI 自动生成标题、文案、图片、视频和配音，一键合成短视频
            </p>
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
              onClick={handleNewProject}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  开始创作
                </>
              )}
            </Button>
          </Card>

          {/* 最近作品 */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-700">最近作品</h2>
              </div>
              <Link
                href="/projects"
                className="text-sm text-blue-600 hover:underline"
              >
                查看全部 →
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Video className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>暂无作品，开始创作你的第一个视频吧</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/topic`}
                    className="block"
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="aspect-video bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                        {project.coverUrl ? (
                          <img
                            src={project.coverUrl}
                            alt={project.title || project.topic}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Video className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <h3 className="font-medium text-slate-700 line-clamp-1">
                        {project.title || project.topic || "未命名作品"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 快速开始 */}
          <Card className="p-4">
            <h3 className="font-medium text-slate-700 mb-4">快速开始</h3>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
              onClick={handleNewProject}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  新建作品
                </>
              )}
            </Button>
          </Card>

          {/* 创作流程 */}
          <Card className="p-4">
            <h3 className="font-medium text-slate-700 mb-4">创作流程</h3>
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0">
                  1
                </span>
                <span>输入创作主题</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0">
                  2
                </span>
                <span>选择 AI 生成的标题</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0">
                  3
                </span>
                <span>设置文案属性</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0">
                  4
                </span>
                <span>选择文案、图片、视频</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0">
                  5
                </span>
                <span>配置配音并合成</span>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
