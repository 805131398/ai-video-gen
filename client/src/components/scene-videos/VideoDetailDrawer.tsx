import { X, Check, Trash2, RefreshCw, Loader2, Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';
import { SceneVideo } from '../../types';

interface VideoDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  video: SceneVideo | null;
  onSelect: (videoId: string) => void;
  onDelete: (videoId: string) => void;
  onRegenerate: (video: SceneVideo) => void;
  selectingVideoId: string | null;
  deletingVideoId: string | null;
}

export default function VideoDetailDrawer({
  isOpen,
  onClose,
  video,
  onSelect,
  onDelete,
  onRegenerate,
  selectingVideoId,
  deletingVideoId,
}: VideoDetailDrawerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded">等待中</span>;
      case 'generating':
        return <span className="px-2 py-1 text-sm bg-blue-100 text-blue-600 rounded flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          生成中
        </span>;
      case 'completed':
        return <span className="px-2 py-1 text-sm bg-green-100 text-green-600 rounded">已完成</span>;
      case 'failed':
        return <span className="px-2 py-1 text-sm bg-red-100 text-red-600 rounded">失败</span>;
      default:
        return null;
    }
  };

  const getPromptTypeLabel = (type: string) => {
    switch (type) {
      case 'smart_combine':
        return '智能组合';
      case 'ai_optimized':
        return 'AI优化';
      default:
        return type;
    }
  };

  if (!isOpen || !video) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">视频详情</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 视频播放器 */}
          <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
            {video.videoUrl && video.status === 'completed' ? (
              <>
                <video
                  ref={videoRef}
                  src={video.videoUrl}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                  controls
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {video.status === 'generating' || video.status === 'pending' ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">视频生成中...</p>
                  </div>
                ) : video.status === 'failed' ? (
                  <div className="text-center">
                    <p className="text-red-400 text-sm">视频生成失败</p>
                    {video.errorMessage && (
                      <p className="text-red-300 text-xs mt-1">{video.errorMessage}</p>
                    )}
                  </div>
                ) : (
                  <Play className="w-12 h-12 text-slate-400" />
                )}
              </div>
            )}
          </div>

          {/* 基本信息 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-900 mb-3">基本信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">时长</span>
                <span className="text-slate-900">{video.duration || '-'}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">状态</span>
                {getStatusLabel(video.status)}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">生成时间</span>
                <span className="text-slate-900">
                  {new Date(video.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">已选中</span>
                <span className={video.isSelected ? 'text-green-600' : 'text-slate-400'}>
                  {video.isSelected ? '✓ 是' : '否'}
                </span>
              </div>
            </div>
          </div>

          {/* 生成参数 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-900 mb-3">生成参数</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">提示词类型</span>
                <span className="text-slate-900">{getPromptTypeLabel(video.promptType)}</span>
              </div>
              {video.metadata && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">故事板格式</span>
                    <span className="text-slate-900">
                      {video.metadata.useStoryboard ? '是' : '否'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">角色形象</span>
                    <span className="text-slate-900">
                      {video.metadata.useCharacterImage ? '是' : '否'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">宽高比</span>
                    <span className="text-slate-900">{video.metadata.aspectRatio || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">高清</span>
                    <span className="text-slate-900">{video.metadata.hd ? '是' : '否'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 提示词 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-900 mb-3">提示词</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
              {video.prompt || '无'}
            </p>
          </div>

          {/* 错误信息 */}
          {video.status === 'failed' && video.errorMessage && (
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-900 mb-2">错误信息</h3>
              <p className="text-sm text-red-600">{video.errorMessage}</p>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {video.status === 'completed' && !video.isSelected && (
              <button
                onClick={() => onSelect(video.id)}
                disabled={selectingVideoId === video.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {selectingVideoId === video.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                选择此视频
              </button>
            )}
            <button
              onClick={() => onRegenerate(video)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重新生成
            </button>
            <button
              onClick={() => onDelete(video.id)}
              disabled={deletingVideoId === video.id}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deletingVideoId === video.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              删除
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
