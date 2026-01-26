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
  Music,
  Film,
  ArrowRight,
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

// 功能特性
const FEATURES = [
  {
    icon: Wand2,
    title: "AI 标题生成",
    description: "智能生成多个吸引眼球的标题",
  },
  {
    icon: Sparkles,
    title: "文案创作",
    description: "根据主题自动生成专业文案",
  },
  {
    icon: Image,
    title: "图片生成",
    description: "AI 绘制匹配内容的精美图片",
  },
  {
    icon: Film,
    title: "视频合成",
    description: "一键合成专业短视频",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  // 获取最近项目
  const { data: projectsData } = useSWR<{
    data: Project[];
    pagination: { total: number };
  }>("/api/projects?pageSize=4", fetcher);

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
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              AI 视频创作工具
            </h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8">
              输入主题，AI 自动生成标题、文案、图片、视频和配音，一键合成专业短视频
            </p>
            <Button
              size="lg"
              onClick={handleNewProject}
              disabled={isCreating}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-8 text-base font-medium"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  开始创作
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <Card
              key={feature.title}
              className="p-4 bg-white shadow-md hover:shadow-lg transition-shadow cursor-default"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                <feature.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-slate-800 mb-1">{feature.title}</h3>
              <p className="text-sm text-slate-500">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 最近作品 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <h2 className="text-lg font-semibold text-slate-800">最近作品</h2>
                </div>
                <Link
                  href="/projects"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  查看全部
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-500 mb-4">暂无作品</p>
                  <Button
                    variant="outline"
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <Video className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-medium text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {project.title || project.topic || "未命名作品"}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* 侧边栏 - 创作流程 */}
          <div>
            <Card className="p-6 sticky top-24">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-blue-500" />
                创作流程
              </h3>
              <ol className="space-y-4">
                {[
                  { step: 1, text: "输入创作主题" },
                  { step: 2, text: "选择 AI 生成的标题" },
                  { step: 3, text: "设置文案属性" },
                  { step: 4, text: "选择文案、图片、视频" },
                  { step: 5, text: "配置配音并合成" },
                ].map((item, index) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-medium shrink-0">
                      {item.step}
                    </span>
                    <span className="text-sm text-slate-600 pt-0.5">{item.text}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  全程 AI 辅助，轻松创作专业视频
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
