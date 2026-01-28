"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "@/hooks/use-project";
import { STEP_TO_ROUTE } from "@/types/ai-video";
import { Loader2 } from "lucide-react";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { project, isLoading } = useProject(id);

  useEffect(() => {
    if (!isLoading && project) {
      // 根据当前步骤重定向到对应的步骤页面
      const currentStepRoute = STEP_TO_ROUTE[project.currentStep] || "topic";
      router.replace(`/projects/${id}/${currentStepRoute}`);
    }
  }, [project, isLoading, id, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );
}
