"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, GitBranch } from "lucide-react";

interface StepActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepLabel: string;
  onView: () => void;
  onBranch: () => void;
}

export function StepActionDialog({
  open,
  onOpenChange,
  stepLabel,
  onView,
  onBranch,
}: StepActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{stepLabel}</DialogTitle>
          <DialogDescription>
            选择要执行的操作
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={() => {
              onView();
              onOpenChange(false);
            }}
          >
            <Eye className="w-5 h-5 mr-3 text-slate-500" />
            <div className="text-left">
              <div className="font-medium">查看内容</div>
              <div className="text-sm text-slate-500">
                查看此步骤的历史数据
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4"
            onClick={() => {
              onBranch();
              onOpenChange(false);
            }}
          >
            <GitBranch className="w-5 h-5 mr-3 text-blue-500" />
            <div className="text-left">
              <div className="font-medium">从此重新开始</div>
              <div className="text-sm text-slate-500">
                创建新分支，从此步骤继续创作
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
