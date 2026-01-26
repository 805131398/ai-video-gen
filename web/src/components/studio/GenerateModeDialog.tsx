"use client";

import { useState } from "react";
import { Sparkles, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageCountSelector } from "./ImageCountSelector";

interface GenerateModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDirectGenerate: (count: number) => void;
  onPromptGenerate: (count: number) => void;
}

export function GenerateModeDialog({
  open,
  onOpenChange,
  onDirectGenerate,
  onPromptGenerate,
}: GenerateModeDialogProps) {
  const [imageCount, setImageCount] = useState(4);

  const handleDirectGenerate = () => {
    onDirectGenerate(imageCount);
    onOpenChange(false);
  };

  const handlePromptGenerate = () => {
    onPromptGenerate(imageCount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>选择生成方式</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 直接生成选项 */}
          <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-base">直接生成图片</h3>
                <p className="text-sm text-muted-foreground">
                  快速生成，使用 AI 自动创建提示词
                </p>
                <Button onClick={handleDirectGenerate} className="w-full">
                  开始生成
                </Button>
              </div>
            </div>
          </div>

          {/* 先生成提示词选项 */}
          <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-base">先生成提示词</h3>
                <p className="text-sm text-muted-foreground">
                  精细控制，编辑提示词后再生成
                </p>
                <Button
                  onClick={handlePromptGenerate}
                  variant="outline"
                  className="w-full"
                >
                  生成提示词
                </Button>
              </div>
            </div>
          </div>

          {/* 图片数量选择器 */}
          <div className="border-t pt-4 space-y-2">
            <ImageCountSelector
              value={imageCount}
              onChange={setImageCount}
            />
            <p className="text-xs text-muted-foreground">
              每次生成的图片数量
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
