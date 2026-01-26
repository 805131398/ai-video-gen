"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Download, Share2, CheckCircle } from "lucide-react";

interface ComposePreviewProps {
  videoUrl?: string;
  audioUrl?: string;
  duration?: number;
  isComposing?: boolean;
  progress?: number;
  onCompose: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

export function ComposePreview({
  videoUrl,
  audioUrl,
  duration = 0,
  isComposing,
  progress = 0,
  onCompose,
  onDownload,
  onShare,
}: ComposePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* 视频预览区域 */}
      <Card className="overflow-hidden">
        <div className="relative aspect-[9/16] max-h-[500px] bg-slate-900 flex items-center justify-center">
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-contain"
              controls={!isComposing}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="text-center text-slate-400">
              <p className="text-lg">视频预览</p>
              <p className="text-sm mt-2">点击下方按钮开始合成</p>
            </div>
          )}

          {/* 合成进度覆盖层 */}
          {isComposing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <div className="w-48 space-y-4">
                <p className="text-white text-center">正在合成视频...</p>
                <Progress value={progress} className="h-2" />
                <p className="text-white/70 text-center text-sm">{progress}%</p>
              </div>
            </div>
          )}
        </div>

        {/* 视频信息 */}
        {videoUrl && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-slate-600">
              时长: {formatDuration(duration)}
            </div>
            <div className="flex gap-2">
              {onDownload && (
                <Button variant="outline" size="sm" onClick={onDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  下载
                </Button>
              )}
              {onShare && (
                <Button variant="outline" size="sm" onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  分享
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* 操作按钮 */}
      {!videoUrl && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={onCompose}
            disabled={isComposing}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isComposing ? (
              <>合成中...</>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                开始合成
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
