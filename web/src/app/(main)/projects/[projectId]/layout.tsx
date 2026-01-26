"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepIndicator, type Step, type StepStatus } from "@/components/studio";
import { useProject } from "@/hooks/use-project";
import { Loader2 } from "lucide-react";
import {
  ROUTE_STEP_ORDER,
  ROUTE_STEP_LABELS,
  STEP_TO_ROUTE,
  getRouteStepIndex,
  type RouteStep,
} from "@/types/ai-video";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 从 URL 中提取 projectId 和当前步骤
  const pathParts = pathname.split("/");
  const projectId = pathParts[2]; // /projects/[projectId]/[step]
  const currentRouteStep = pathParts[3] as RouteStep;

  const { project, isLoading, isError } = useProject(projectId);

  // 构建步骤数据
  const steps: Step[] = ROUTE_STEP_ORDER.map((step) => {
    const stepIndex = getRouteStepIndex(step);
    const currentStepRoute = project?.currentStep ? STEP_TO_ROUTE[project.currentStep] : "topic";
    const currentStepIndex = currentStepRoute ? getRouteStepIndex(currentStepRoute) : 0;

    let status: StepStatus = "upcoming";
    if (stepIndex < currentStepIndex) {
      status = "completed";
    } else if (step === currentRouteStep) {
      status = "current";
    }

    return {
      id: step,
      label: ROUTE_STEP_LABELS[step],
      status,
    };
  });

  // 步骤保护：如果用户访问的步骤超过当前进度，重定向到当前步骤
  useEffect(() => {
    if (!project || isLoading) return;

    const currentStepRoute = STEP_TO_ROUTE[project.currentStep] || "topic";
    const currentStepIndex = getRouteStepIndex(currentStepRoute);
    const requestedStepIndex = getRouteStepIndex(currentRouteStep);

    // 如果请求的步骤超过当前进度，重定向
    if (requestedStepIndex > currentStepIndex) {
      router.replace(`/projects/${projectId}/${currentStepRoute}`);
    }
  }, [project, isLoading, currentRouteStep, projectId, router]);

  // 处理步骤点击
  const handleStepClick = (stepId: string | number) => {
    const step = typeof stepId === "string" ? stepId : ROUTE_STEP_ORDER[stepId];
    router.push(`/projects/${projectId}/${step}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 text-center">
          <p className="text-slate-500">项目不存在或加载失败</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            返回首页
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Step Indicator */}
        <Card className="p-4">
          <StepIndicator
            steps={steps}
            currentStep={currentRouteStep}
            onStepClick={handleStepClick}
          />
        </Card>

        {/* Step Content */}
        <Card className="p-6">{children}</Card>
      </div>
    </div>
  );
}
