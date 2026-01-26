"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Check, Clock, Play } from "lucide-react";
import Image from "next/image";

interface Version {
  id: string;
  versionNo: number;
  branchName?: string | null;
  isMain: boolean;
  currentStep: string;
  createdAt: string;
  thumbnailUrl?: string | null;
}

interface VersionTreeProps {
  versions: Version[];
  currentVersionId: string;
  onVersionSelect: (versionId: string) => void;
  onCreateBranch?: () => void;
}

const stepLabels: Record<string, string> = {
  TOPIC_INPUT: "主题输入",
  TITLE_GENERATE: "标题生成",
  TITLE_SELECT: "标题选择",
  ATTRIBUTE_SET: "属性设置",
  COPY_GENERATE: "文案生成",
  COPY_SELECT: "文案选择",
  IMAGE_GENERATE: "图片生成",
  IMAGE_SELECT: "图片选择",
  VIDEO_GENERATE: "视频生成",
  VIDEO_SELECT: "视频选择",
  VOICE_CONFIG: "配音配置",
  VOICE_GENERATE: "配音生成",
  COMPOSE: "已完成",
};

export function VersionTree({
  versions,
  currentVersionId,
  onVersionSelect,
  onCreateBranch,
}: VersionTreeProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <GitBranch className="w-4 h-4" />
          版本历史
        </div>
        {onCreateBranch && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onCreateBranch}
          >
            + 新分支
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {versions.map((version) => {
          const isSelected = version.id === currentVersionId;
          const isCompleted = version.currentStep === "COMPOSE";

          return (
            <div
              key={version.id}
              className={cn(
                "rounded-lg border p-3 cursor-pointer transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              )}
              onClick={() => onVersionSelect(version.id)}
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
                  {version.thumbnailUrl ? (
                    <Image
                      src={version.thumbnailUrl}
                      alt={`v${version.versionNo}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      v{version.versionNo}
                    </span>
                    {version.isMain && (
                      <Badge variant="secondary" className="text-xs h-5">
                        主分支
                      </Badge>
                    )}
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </div>

                  {version.branchName && !version.isMain && (
                    <div className="text-sm text-slate-600 truncate">
                      {version.branchName}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span
                      className={cn(
                        isCompleted ? "text-emerald-600" : "text-amber-600"
                      )}
                    >
                      {stepLabels[version.currentStep] || version.currentStep}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(version.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}