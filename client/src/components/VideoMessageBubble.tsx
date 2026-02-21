import { useState } from 'react';
import { Download, FolderOpen, X, Play } from 'lucide-react';

interface VideoMessageBubbleProps {
  videoUrl: string;
  thumbnailUrl?: string;
  prompt?: string;
  params?: Record<string, any>;
  onSave?: () => void;
  onSaveAs?: () => void;
}

export default function VideoMessageBubble({
  videoUrl, thumbnailUrl, prompt, params, onSave, onSaveAs,
}: VideoMessageBubbleProps) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div className="space-y-2">
        {/* 小尺寸播放器 */}
        <div
          className="relative w-80 h-[180px] rounded-lg overflow-hidden bg-black cursor-pointer group"
          onClick={() => setFullscreen(true)}
        >
          <video
            src={videoUrl}
            poster={thumbnailUrl}
            className="w-full h-full object-contain"
            muted
            playsInline
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-10 h-10 text-white/80" />
          </div>
        </div>

        {/* prompt 摘要 */}
        {prompt && (
          <p className="text-xs text-slate-500 line-clamp-2 max-w-80">
            {prompt}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>保存</span>
            </button>
          )}
          {onSaveAs && (
            <button
              onClick={onSaveAs}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>另存为</span>
            </button>
          )}
        </div>
      </div>

      {/* 全屏预览 */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setFullscreen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <video
              src={videoUrl}
              poster={thumbnailUrl}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setFullscreen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
