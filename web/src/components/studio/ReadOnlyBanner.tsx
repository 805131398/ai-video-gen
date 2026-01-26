"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Edit, GitBranch } from "lucide-react";

interface ReadOnlyBannerProps {
  versionName: string;
  isLatest: boolean;
  onContinueEdit?: () => void;
  onCreateBranch: () => void;
}

export function ReadOnlyBanner({
  versionName,
  isLatest,
  onContinueEdit,
  onCreateBranch,
}: ReadOnlyBannerProps) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            正在查看 <strong>{versionName}</strong> · 只读模式
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLatest && onContinueEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onContinueEdit}
            >
              <Edit className="w-3 h-3 mr-1" />
              继续编辑
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
            onClick={onCreateBranch}
          >
            <GitBranch className="w-3 h-3 mr-1" />
            从此创建分支
          </Button>
        </div>
      </div>
    </div>
  );
}
