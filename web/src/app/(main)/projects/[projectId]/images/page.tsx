"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import { GenerateModeDialog } from "@/components/studio/GenerateModeDialog";
import { PromptEditorDialog } from "@/components/studio/PromptEditorDialog";
import {
  Check,
  Sparkles,
  Upload,
  Loader2,
  ZoomIn,
  ImagePlus,
  X,
  Images,
  Copy,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import type { ImageBatch, ImageOption } from "@/types/ai-video";

// 图片卡片组件
function ImageCard({
  image,
  isSelected,
  onToggleSelect,
}: {
  image: ImageOption;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="break-inside-avoid mb-4">
      <div
        className={cn(
          "relative rounded-lg overflow-hidden group cursor-pointer",
          "border-2 transition-all",
          isSelected
            ? "border-blue-500 ring-2 ring-blue-200"
            : "border-transparent hover:border-slate-300"
        )}
      >
        {/* 图片 - 使用原始比例 */}
        <Image
          src={image.imageUrl}
          alt="Generated image"
          width={400}
          height={0}
          className="w-full h-auto"
          style={{ height: "auto" }}
        />

        {/* 选中标记 */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}

        {/* 悬浮操作按钮 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          {/* 查看/放大 */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors cursor-pointer shadow-lg"
                title="查看详情"
              >
                <ZoomIn className="w-5 h-5 text-slate-700" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] p-0 overflow-hidden">
              <DialogTitle className="sr-only">图片详情</DialogTitle>
              <div className="flex flex-col h-full">
                {/* 上方：图片（占大部分高度） */}
                <div className="w-full bg-slate-900 flex items-center justify-center p-6 relative min-h-[30vh]">
                  <Image
                    src={image.imageUrl}
                    alt="Full size image"
                    fill
                    sizes="(max-width: 1200px) 95vw, 1200px"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(image.imageUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="object-contain cursor-pointer"
                  />
                </div>

                {/* 下方：信息面板 */}
                <div className="w-full bg-white p-6 overflow-y-auto border-t border-slate-200">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    图片信息
                  </h3>

                  <div className="space-y-4">
                    {/* 模型信息 */}
                    {image.model && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          模型
                        </label>
                        <p className="mt-1 text-sm text-slate-900 font-mono bg-slate-50 px-2 py-1 rounded">
                          {image.model}
                        </p>
                      </div>
                    )}

                    {/* 尺寸 */}
                    {image.size && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          尺寸
                        </label>
                        <p className="mt-1 text-sm text-slate-900">
                          {image.size}
                        </p>
                      </div>
                    )}

                    {/* 生成时间 */}
                    {image.generatedAt && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          生成时间
                        </label>
                        <p className="mt-1 text-sm text-slate-900">
                          {formatDate(image.generatedAt)}
                        </p>
                      </div>
                    )}

                    {/* 来源 */}
                    {image.source && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          来源
                        </label>
                        <p className="mt-1 text-sm text-slate-900">
                          {image.source === "ai" ? "AI 生成" : image.source === "upload" ? "用户上传" : image.source}
                        </p>
                      </div>
                    )}

                    {/* 提示词 */}
                    {image.prompt && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            提示词
                          </label>
                          <button
                            onClick={() => handleCopyPrompt(image.prompt!)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            {copied ? "已复制" : "复制"}
                          </button>
                        </div>
                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {image.prompt}
                        </p>
                      </div>
                    )}

                    {/* 修订后的提示词 */}
                    {image.revisedPrompt && image.revisedPrompt !== image.prompt && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            修订后提示词
                          </label>
                          <button
                            onClick={() => handleCopyPrompt(image.revisedPrompt!)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            复制
                          </button>
                        </div>
                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {image.revisedPrompt}
                        </p>
                      </div>
                    )}

                    {/* 无信息提示 */}
                    {!image.model && !image.prompt && !image.generatedAt && (
                      <p className="text-sm text-slate-500 italic">
                        暂无详细信息
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* 选择/取消选择 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-lg",
              isSelected
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-white/90 hover:bg-white"
            )}
            title={isSelected ? "取消选择" : "选择"}
          >
            <Check className={cn("w-5 h-5", isSelected ? "text-white" : "text-slate-700")} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImagesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [promptData, setPromptData] = useState({ english: "", chinese: "" });
  const [pendingImageCount, setPendingImageCount] = useState(4);

  // 先获取项目数据（不带轮询）
  const { project, mutate } = useProject(projectId);

  // 获取图片步骤状态，判断是否正在生成
  const imagesStatus = project?.steps?.images?.status;
  const isBackgroundGenerating = imagesStatus === "GENERATING";

  // 当后台正在生成时，启用轮询
  useProject(projectId, {
    refreshInterval: isBackgroundGenerating ? 3000 : 0,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(
    project?.steps?.images?.selectedIds || []
  );

  const images: ImageOption[] = project?.steps?.images?.options || [];
  const batches: ImageBatch[] = project?.steps?.images?.batches || [];

  // 当后台生成完成时，刷新数据
  useEffect(() => {
    if (imagesStatus === "COMPLETED" || imagesStatus === "FAILED") {
      mutate();
      setCurrentBatchId(null);
    }
  }, [imagesStatus, mutate]);

  // 生成图片 - 打开模式选择对话框
  const handleGenerate = () => {
    setShowModeDialog(true);
  };

  // 直接生成图片
  const handleDirectGenerate = async (count: number) => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", count }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成图片失败");
      }

      // 保存当前批次ID
      if (data.batchId) {
        setCurrentBatchId(data.batchId);
      }

      // 异步生成已启动，刷新数据以获取 GENERATING 状态
      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成图片失败";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成提示词
  const handlePromptGenerate = async (count: number) => {
    setPendingImageCount(count);
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/images/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成提示词失败");
      }

      // 设置提示词数据
      setPromptData({
        english: data.prompt,
        chinese: data.translation,
      });

      // 显示提示词编辑器
      setShowPromptEditor(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成提示词失败";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 使用提示词生成图片
  const handleGenerateWithPrompt = async (prompt: string, count: number) => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          count,
          customPrompt: prompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成图片失败");
      }

      if (data.batchId) {
        setCurrentBatchId(data.batchId);
      }

      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成图片失败";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // 取消/关闭生成任务
  const handleCancelGenerate = async () => {
    try {
      await fetch(
        `/api/projects/${projectId}/steps/images/generate?batchId=${currentBatchId || ""}`,
        { method: "DELETE" }
      );
      setCurrentBatchId(null);
      await mutate();
    } catch (err) {
      console.error("取消任务失败:", err);
    }
  };

  // 上传图片
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/projects/${projectId}/steps/images/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "上传图片失败");
      }

      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传图片失败";
      setError(message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 选择/取消选择图片
  const handleToggleSelect = (imageId: string) => {
    setSelectedIds((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId]
    );
  };

  // 确认选择，进入下一步
  const handleConfirm = async () => {
    if (selectedIds.length === 0) {
      setError("请至少选择一张图片");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/images/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: selectedIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "保存选择失败");
      }

      await mutate();
      router.push(`/projects/${projectId}/videos`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存选择失败";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isGenerating || isUploading || isSubmitting;

  // 获取所有图片（用于统计和空状态判断）
  const allImages = batches.length > 0
    ? batches.flatMap((batch) => batch.images)
    : images;

  return (
    <div className="space-y-6">
      {error && (
        <AIErrorDisplay error={error} onDismiss={() => setError(null)} />
      )}

      {/* 后台生成状态提示 */}
      {isBackgroundGenerating && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-900">正在生成图片...</p>
              <p className="text-xs text-blue-600">图片生成需要一些时间，完成后会自动显示</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelGenerate}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="w-4 h-4 mr-1" />
            取消
          </Button>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-900">选择图片素材</h2>
          <p className="text-sm text-slate-500 mt-1">
            上传或生成图片，选择用于生成视频的素材
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 上传按钮 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isBackgroundGenerating}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            上传图片
          </Button>

          {/* AI 生成按钮 */}
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isLoading || isBackgroundGenerating}
          >
            {(isGenerating || isBackgroundGenerating) ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isBackgroundGenerating ? "生成中..." : "AI 生成"}
          </Button>
        </div>
      </div>

      {/* 批次信息 */}
      {batches.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Images className="w-4 h-4" />
          <span>{batches.length} 个批次</span>
          <span className="text-slate-400">·</span>
          <span>共 {allImages.length} 张图片</span>
        </div>
      )}

      {/* 按批次分组显示图片 */}
      {allImages.length > 0 ? (
        <div className="space-y-8">
          {batches.length > 0 ? (
            // 有批次数据时，按批次分组显示
            batches.map((batch, batchIndex) => (
              <div key={batch.id} className="space-y-4">
                {/* 批次标题 */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {batchIndex + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">
                        批次 {batchIndex + 1}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {batch.images.length} 张图片
                        {batch.createdAt && (
                          <span className="ml-2">
                            · {new Date(batch.createdAt).toLocaleString("zh-CN", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 批次图片 */}
                <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
                  {batch.images.map((image) => (
                    <ImageCard
                      key={image.id}
                      image={image}
                      isSelected={selectedIds.includes(image.id)}
                      onToggleSelect={() => handleToggleSelect(image.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // 没有批次数据时，直接显示所有图片
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
              {allImages.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  isSelected={selectedIds.includes(image.id)}
                  onToggleSelect={() => handleToggleSelect(image.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : !isBackgroundGenerating ? (
        /* 空状态 */
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
          <ImagePlus className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">还没有图片，上传或生成一些吧</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="w-4 h-4 mr-2" />
              上传图片
            </Button>
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI 生成
            </Button>
          </div>
        </div>
      ) : null}

      {/* 底部操作栏 */}
      {allImages.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500">
            已选择 <span className="text-blue-600 font-medium">{selectedIds.length}</span> 张图片
          </span>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || isBackgroundGenerating || selectedIds.length === 0}
            className="bg-blue-600 hover:bg-blue-700 px-8"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              "下一步"
            )}
          </Button>
        </div>
      )}

      {/* 生成模式选择对话框 */}
      <GenerateModeDialog
        open={showModeDialog}
        onOpenChange={setShowModeDialog}
        onDirectGenerate={handleDirectGenerate}
        onPromptGenerate={handlePromptGenerate}
      />

      {/* 提示词编辑对话框 */}
      <PromptEditorDialog
        open={showPromptEditor}
        onOpenChange={setShowPromptEditor}
        initialPrompt={promptData.english}
        initialTranslation={promptData.chinese}
        projectId={projectId}
        onGenerate={handleGenerateWithPrompt}
      />
    </div>
  );
}