import { VideoGenProgress } from '../types';
import { Loader2, X, Video, CheckCircle2, AlertCircle } from 'lucide-react';

interface VideoProgressBarProps {
  progress: VideoGenProgress;
  onCancel?: () => void;
}

const STAGE_LABELS: Record<VideoGenProgress['stage'], string> = {
  uploading: '上传图片中...',
  submitting: '提交生成任务...',
  generating: '视频生成中...',
  completed: '生成完成',
  failed: '生成失败',
};

export default function VideoProgressBar({ progress, onCancel }: VideoProgressBarProps) {
  const isActive = progress.stage === 'uploading' || progress.stage === 'submitting' || progress.stage === 'generating';
  const isFailed = progress.stage === 'failed';
  const isCompleted = progress.stage === 'completed';

  if (isCompleted) return null;

  return (
    <div className={`mx-6 mt-3 px-4 py-2.5 rounded-lg border flex items-center gap-3 ${
      isFailed
        ? 'bg-red-50 border-red-200'
        : 'bg-blue-50 border-blue-200'
    }`}>
      {isActive && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
      {isFailed && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
      {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}

      <Video className="w-4 h-4 text-slate-400 shrink-0" />

      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${isFailed ? 'text-red-600' : 'text-slate-700'}`}>
          {STAGE_LABELS[progress.stage]}
        </span>
        {progress.status && isActive && (
          <span className="text-xs text-slate-400 ml-2">({progress.status})</span>
        )}
        {isFailed && progress.error && (
          <span className="text-xs text-red-500 ml-2 truncate">{progress.error}</span>
        )}
      </div>

      {isActive && onCancel && (
        <button
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
