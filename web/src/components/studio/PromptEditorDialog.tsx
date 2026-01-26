"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { ImageCountSelector } from "./ImageCountSelector";

interface PromptEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt: string;
  initialTranslation: string;
  projectId: string;
  onGenerate: (prompt: string, count: number) => void;
}

export function PromptEditorDialog({
  open,
  onOpenChange,
  initialPrompt,
  initialTranslation,
  projectId,
  onGenerate,
}: PromptEditorDialogProps) {
  const [englishPrompt, setEnglishPrompt] = useState("");
  const [chineseTranslation, setChineseTranslation] = useState("");
  const [imageCount, setImageCount] = useState(4);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");

  // 初始化状态
  useEffect(() => {
    if (open) {
      setEnglishPrompt(initialPrompt);
      setChineseTranslation(initialTranslation);
      setError("");
    }
  }, [open, initialPrompt, initialTranslation]);

  // 翻译为中文
  const handleTranslateToZh = async () => {
    if (!englishPrompt.trim()) {
      setError("英文提示词不能为空");
      return;
    }

    setIsTranslating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/steps/images/translate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: englishPrompt,
            direction: "en-zh",
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "翻译失败");
      }

      const data = await response.json();
      setChineseTranslation(data.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败");
    } finally {
      setIsTranslating(false);
    }
  };

  // 翻译为英文
  const handleTranslateToEn = async () => {
    if (!chineseTranslation.trim()) {
      setError("中文翻译不能为空");
      return;
    }

    setIsTranslating(true);
    setError("");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/steps/images/translate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: chineseTranslation,
            direction: "zh-en",
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "翻译失败");
      }

      const data = await response.json();
      setEnglishPrompt(data.translation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败");
    } finally {
      setIsTranslating(false);
    }
  };

  // 生成图片
  const handleGenerate = () => {
    if (!englishPrompt.trim()) {
      setError("英文提示词不能为空");
      return;
    }

    onGenerate(englishPrompt, imageCount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1600px]">
        <DialogHeader>
          <DialogTitle>编辑提示词</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* 左侧面板 - 英文 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">English Prompt</label>
              <span className="text-xs text-muted-foreground">
                {englishPrompt.length} 字符
              </span>
            </div>
            <Textarea
              value={englishPrompt}
              onChange={(e) => setEnglishPrompt(e.target.value)}
              placeholder="输入英文提示词..."
              className="h-64 resize-none"
              disabled={isTranslating}
            />
            <Button
              onClick={handleTranslateToZh}
              disabled={isTranslating || !englishPrompt.trim()}
              variant="outline"
              className="w-full"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  翻译中...
                </>
              ) : (
                <>
                  翻译为中文
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* 右侧面板 - 中文 */}
          <div className="space-y-3 border-l pl-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">中文翻译</label>
              <span className="text-xs text-muted-foreground">
                {chineseTranslation.length} 字符
              </span>
            </div>
            <Textarea
              value={chineseTranslation}
              onChange={(e) => setChineseTranslation(e.target.value)}
              placeholder="输入中文翻译..."
              className="h-64 resize-none"
              disabled={isTranslating}
            />
            <Button
              onClick={handleTranslateToEn}
              disabled={isTranslating || !chineseTranslation.trim()}
              variant="outline"
              className="w-full"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  翻译中...
                </>
              ) : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  翻译为英文
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        {/* 底部操作栏 */}
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <ImageCountSelector
            value={imageCount}
            onChange={setImageCount}
            disabled={isTranslating}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isTranslating}
            >
              取消
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isTranslating || !englishPrompt.trim()}
            >
              生成图片
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
