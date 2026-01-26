"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface VideoOption {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
}

interface VideoSelectorProps {
  videos: VideoOption[];
  onSelect: (videos: VideoOption[]) => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  selectedIds?: string[];
  multiple?: boolean;
}

export function VideoSelector({
  videos,
  onSelect,
  onRegenerate,
  isLoading,
  selectedIds = [],
  multiple = true,
}: VideoSelectorProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const handleSelect = (video: VideoOption) => {
    let newSelected: string[];
    if (multiple) {
      if (selected.includes(video.id)) {
        newSelected = selected.filter((id) => id !== video.id);
      } else {
        newSelected = [...selected, video.id];
      }
    } else {
      newSelected = [video.id];
    }
    setSelected(newSelected);
    onSelect(videos.filter((v) => newSelected.includes(v.id)));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          选择视频 {multiple && `(已选 ${selected.length} 个)`}
        </label>
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            重新生成
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className={cn(
              "relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer group",
              "border-2 transition-all",
              selected.includes(video.id)
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-transparent hover:border-slate-300"
            )}
            onClick={() => handleSelect(video)}
          >
            {/* 缩略图 */}
            <img
              src={video.thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />

            {/* 时长标签 */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs">
              {formatDuration(video.duration)}
            </div>

            {/* 选中标记 */}
            {selected.includes(video.id) && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* 播放按钮 */}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-slate-800 ml-1" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl p-0">
                <video
                  src={video.videoUrl}
                  controls
                  autoPlay
                  className="w-full max-h-[80vh]"
                />
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>
    </div>
  );
}
