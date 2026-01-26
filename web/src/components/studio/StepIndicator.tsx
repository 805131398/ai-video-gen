"use client";

import { cn } from "@/lib/utils";
import { Check, Circle, Loader2 } from "lucide-react";

export type StepStatus = "pending" | "active" | "completed" | "error" | "current" | "upcoming";

export interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number | string;
  onStepClick?: (stepId: string | number) => void;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-between w-full", className)}>
      {steps.map((step, index) => {
        const isActive = typeof currentStep === "number"
          ? index === currentStep
          : step.id === currentStep;
        const isCompleted = step.status === "completed";
        const isCurrent = step.status === "current" || step.status === "active";
        const isClickable = onStepClick && (isCompleted || isActive || isCurrent);

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => isClickable && onStepClick(typeof currentStep === "number" ? index : step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all shrink-0",
                (isActive || isCurrent) && "bg-blue-50 text-blue-600",
                isCompleted && "text-blue-600 hover:bg-blue-50",
                !isActive && !isCompleted && !isCurrent && "text-slate-400",
                isClickable && "cursor-pointer"
              )}
            >
              <StepIcon status={step.status} isActive={isActive || isCurrent} />
              <span className="text-sm font-medium whitespace-nowrap">
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 min-w-[16px]",
                  isCompleted ? "bg-blue-500" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepIcon({ status, isActive }: { status: StepStatus; isActive: boolean }) {
  if (status === "completed") {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
        <Check className="w-3 h-3 text-white" />
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
        <Loader2 className="w-3 h-3 text-white animate-spin" />
      </div>
    );
  }

  return (
    <Circle className="w-5 h-5 text-slate-300" />
  );
}
