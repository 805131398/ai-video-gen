import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Film, Loader2, VideoOff } from 'lucide-react';
import { ScriptScene } from '../../types';

interface VideoStatus {
  sceneId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'no_video';
  progress: number;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  errorMessage?: string | null;
}

interface TimelineViewProps {
  scenes: ScriptScene[];
  videoStatuses: Map<string, VideoStatus>;
  onEditScene: (scene: ScriptScene) => void;
}

// 时间轴上单个场景的视频格子
function TimelineVideoCell({ status }: { status?: VideoStatus }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  const hasVideo = status && status.status === 'completed' && status.videoUrl;

  if (!status || status.status === 'no_video') {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <VideoOff className="w-4 h-4 text-slate-600" />
      </div>
    );
  }

  if (status.status === 'generating' || status.status === 'pending') {
    return (
      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        <span className="text-[10px] text-blue-400 mt-1">
          {status.status === 'pending' ? '排队' : `${status.progress}%`}
        </span>
      </div>
    );
  }

  if (status.status === 'failed') {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <VideoOff className="w-4 h-4 text-red-400" />
      </div>
    );
  }

  if (!hasVideo) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <VideoOff className="w-4 h-4 text-slate-600" />
      </div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        src={status.videoUrl!}
        className="w-full h-full object-contain"
        preload="metadata"
        muted
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      />
      {/* 播放按钮覆盖层 - 未播放时显示 */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          <div className="w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center">
            <Play className="w-4 h-4 text-slate-800 ml-0.5" fill="currentColor" />
          </div>
        </div>
      )}
      {/* 正在播放指示 */}
      {isPlaying && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </>
  );
}

// 单场景视频预览组件
function SceneVideoPreview({ status }: { status?: VideoStatus }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // 无视频状态
  if (!status || status.status === 'no_video') {
    return (
      <div className="w-48 h-27 bg-slate-100 rounded-lg flex flex-col items-center justify-center shrink-0">
        <VideoOff className="w-6 h-6 text-slate-300 mb-1" />
        <span className="text-xs text-slate-400">暂无视频</span>
      </div>
    );
  }

  // 生成中
  if (status.status === 'pending' || status.status === 'generating') {
    return (
      <div className="w-48 h-27 bg-slate-100 rounded-lg flex flex-col items-center justify-center shrink-0">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-1" />
        <span className="text-xs text-blue-600">
          {status.status === 'pending' ? '排队中' : `生成中 ${status.progress}%`}
        </span>
        {status.status === 'generating' && (
          <div className="w-3/4 h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // 生成失败
  if (status.status === 'failed') {
    return (
      <div className="w-48 h-27 bg-red-50 rounded-lg flex flex-col items-center justify-center shrink-0">
        <VideoOff className="w-6 h-6 text-red-400 mb-1" />
        <span className="text-xs text-red-500">生成失败</span>
      </div>
    );
  }

  // 有视频 - 显示播放器
  return (
    <div
      className="relative w-48 h-27 bg-black rounded-lg overflow-hidden shrink-0 cursor-pointer group"
      onClick={handleTogglePlay}
    >
      {status.videoUrl ? (
        <video
          ref={videoRef}
          src={status.videoUrl}
          poster={status.thumbnailUrl || undefined}
          className="w-full h-full object-contain"
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      ) : status.thumbnailUrl ? (
        <img
          src={status.thumbnailUrl}
          alt="视频缩略图"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Film className="w-8 h-8 text-slate-500" />
        </div>
      )}
      {/* 播放/暂停按钮覆盖层 */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white" fill="white" />
        </div>
      )}
    </div>
  );
}

// 总览顺序播放器
function OverviewPlayer({
  scenes,
  videoStatuses,
}: {
  scenes: ScriptScene[];
  videoStatuses: Map<string, VideoStatus>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const autoPlayNextRef = useRef(false);

  // 筛选有视频的场景
  const scenesWithVideo = scenes.filter((scene) => {
    const vs = videoStatuses.get(scene.id);
    return vs && vs.status === 'completed' && vs.videoUrl;
  });

  const currentScene = scenesWithVideo[currentIndex];
  const currentStatus = currentScene ? videoStatuses.get(currentScene.id) : undefined;

  // 切换场景时加载并自动播放
  useEffect(() => {
    if (videoRef.current && currentStatus?.videoUrl) {
      videoRef.current.load();
      if (isPlaying || autoPlayNextRef.current) {
        autoPlayNextRef.current = false;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentIndex]);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const handleEnded = useCallback(() => {
    // 自动播放下一个场景
    if (currentIndex < scenesWithVideo.length - 1) {
      autoPlayNextRef.current = true;
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, scenesWithVideo.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < scenesWithVideo.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, scenesWithVideo.length]);

  const handleJumpTo = useCallback(
    (sceneId: string) => {
      const idx = scenesWithVideo.findIndex((s) => s.id === sceneId);
      if (idx >= 0) {
        setCurrentIndex(idx);
        setIsPlaying(true);
      }
    },
    [scenesWithVideo]
  );

  if (scenesWithVideo.length === 0) {
    return (
      <div className="bg-white rounded-lg border-2 border-slate-200 p-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">视频总览</h3>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <VideoOff className="w-12 h-12 mb-3" />
          <p className="text-sm">暂无已完成的场景视频</p>
          <p className="text-xs mt-1">完成场景视频生成并选择后，可在此处预览整体效果</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">视频总览</h3>
        <span className="text-sm text-slate-500">
          {scenesWithVideo.length}/{scenes.length} 个场景已有视频
        </span>
      </div>

      {/* 主播放器 */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9', maxHeight: '480px' }}>
        {currentStatus?.videoUrl ? (
          <video
            ref={videoRef}
            src={currentStatus.videoUrl}
            poster={currentStatus.thumbnailUrl || undefined}
            className="w-full h-full object-contain"
            onEnded={handleEnded}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-16 h-16 text-slate-600" />
          </div>
        )}

        {/* 播放控制覆盖层 */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="text-white disabled:opacity-30 hover:opacity-80 transition-opacity"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" fill="white" />
                )}
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex === scenesWithVideo.length - 1}
                className="text-white disabled:opacity-30 hover:opacity-80 transition-opacity"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            <div className="text-white text-sm">
              <span className="font-medium">{currentScene?.title}</span>
              <span className="opacity-60 ml-2">
                ({currentIndex + 1}/{scenesWithVideo.length})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 场景进度指示 */}
      <div className="flex gap-1 mb-4">
        {scenesWithVideo.map((_, idx) => (
          <div
            key={idx}
            className={`h-1 flex-1 rounded-full transition-colors ${
              idx === currentIndex ? 'bg-blue-500' : idx < currentIndex ? 'bg-blue-200' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* 缩略图网格 */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {scenes.map((scene, index) => {
          const vs = videoStatuses.get(scene.id);
          const hasVideo = vs && vs.status === 'completed' && vs.videoUrl;
          const isActive = currentScene?.id === scene.id;

          return (
            <div
              key={scene.id}
              onClick={() => hasVideo && handleJumpTo(scene.id)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                isActive
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : hasVideo
                    ? 'border-slate-200 hover:border-blue-300 cursor-pointer'
                    : 'border-slate-200 opacity-50'
              }`}
              style={{ aspectRatio: '16/9' }}
            >
              {hasVideo && vs.thumbnailUrl ? (
                <img
                  src={vs.thumbnailUrl}
                  alt={scene.title}
                  className="w-full h-full object-cover"
                />
              ) : hasVideo && vs.videoUrl ? (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <Film className="w-4 h-4 text-slate-400" />
                </div>
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                  <VideoOff className="w-4 h-4 text-slate-300" />
                </div>
              )}
              {/* 场景序号 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                <p className="text-[10px] text-white truncate">
                  #{index + 1} {scene.title}
                </p>
              </div>
              {/* 当前播放标识 */}
              {isActive && isPlaying && (
                <div className="absolute top-1 right-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TimelineView({ scenes, videoStatuses, onEditScene }: TimelineViewProps) {
  // 计算总时长
  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  // 计算每个场景的时间轴位置
  let currentTime = 0;
  const timelineScenes = scenes.map((scene) => {
    const startTime = currentTime;
    const duration = scene.duration || 10; // 默认 10 秒
    currentTime += duration;
    return {
      scene,
      startTime,
      duration,
      widthPercent: totalDuration > 0 ? (duration / totalDuration) * 100 : 100 / scenes.length,
    };
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 时间轴总览 */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">时间轴总览</h3>
          <div className="text-sm text-slate-600">
            总时长: <span className="font-semibold">{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* 视频缩略图带 - 与时间轴对齐 */}
        <div className="relative h-24 bg-slate-900 rounded-t-lg overflow-hidden">
          {timelineScenes.map(({ scene, startTime, widthPercent }) => {
            const vs = videoStatuses.get(scene.id);
            return (
              <div
                key={scene.id}
                className="absolute top-0 h-full border-r border-slate-700 overflow-hidden"
                style={{
                  left: `${(startTime / totalDuration) * 100}%`,
                  width: `${widthPercent}%`,
                }}
              >
                <TimelineVideoCell status={vs} />
              </div>
            );
          })}
        </div>

        {/* 时间轴可视化 */}
        <div className="relative h-10 bg-slate-100 rounded-b-lg overflow-hidden">
          {timelineScenes.map(({ scene, startTime, duration, widthPercent }, index) => {
            const vs = videoStatuses.get(scene.id);
            const hasVideo = vs && vs.status === 'completed';
            return (
              <div
                key={scene.id}
                className="absolute top-0 h-full border-r border-white hover:opacity-80 transition-opacity cursor-pointer group"
                style={{
                  left: `${(startTime / totalDuration) * 100}%`,
                  width: `${widthPercent}%`,
                  backgroundColor: hasVideo
                    ? `hsl(${(index * 360) / scenes.length}, 70%, 50%)`
                    : `hsl(${(index * 360) / scenes.length}, 30%, 75%)`,
                }}
                onClick={() => onEditScene(scene)}
              >
                <div className="px-2 h-full flex items-center gap-2">
                  <p className="text-xs font-medium text-white truncate">{scene.title}</p>
                  <p className="text-xs text-white opacity-90 shrink-0">{duration}s</p>
                </div>
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
              </div>
            );
          })}
        </div>

        {/* 时间刻度 */}
        <div className="relative h-6 mt-2">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <div
              key={ratio}
              className="absolute top-0 text-xs text-slate-500"
              style={{ left: `${ratio * 100}%`, transform: 'translateX(-50%)' }}
            >
              {formatTime(Math.floor(totalDuration * ratio))}
            </div>
          ))}
        </div>
      </div>

      {/* 场景详细列表 - 带视频预览 */}
      <div className="space-y-3">
        {timelineScenes.map(({ scene, startTime, duration }, index) => {
          const vs = videoStatuses.get(scene.id);
          return (
            <div
              key={scene.id}
              className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* 左侧视频预览 */}
                <SceneVideoPreview status={vs} />

                {/* 右侧场景信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                      <h4 className="text-lg font-semibold text-slate-900">{scene.title}</h4>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {formatTime(startTime)} - {formatTime(startTime + duration)}
                      </span>
                    </div>
                    <button
                      onClick={() => onEditScene(scene)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                    >
                      编辑
                    </button>
                  </div>

                  {scene.content.description && (
                    <p className="text-sm text-slate-600 mb-2">{scene.content.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      {duration}s
                    </span>
                    {scene.content.characters && scene.content.characters.length > 0 && (
                      <span>{scene.content.characters.length + 1} 个角色</span>
                    )}
                    {scene.content.dialogues && scene.content.dialogues.length > 0 && (
                      <span>{scene.content.dialogues.length} 条台词</span>
                    )}
                    {vs && vs.status === 'completed' && (
                      <span className="text-green-600 font-medium">视频已就绪</span>
                    )}
                    {vs && vs.status === 'generating' && (
                      <span className="text-blue-600 font-medium">生成中 {vs.progress}%</span>
                    )}
                    {vs && vs.status === 'failed' && (
                      <span className="text-red-500 font-medium">生成失败</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {scenes.length === 0 && (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">暂无场景，请先添加场景</p>
        </div>
      )}

      {/* 视频总览区 */}
      {scenes.length > 0 && (
        <OverviewPlayer scenes={scenes} videoStatuses={videoStatuses} />
      )}
    </div>
  );
}
