import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Filter, SortAsc, Play, Check, Trash2, RefreshCw, Eye, Loader2, AlertCircle } from 'lucide-react';
import { getScript, getScriptScenes, getSceneVideos, selectSceneVideo, deleteSceneVideo } from '../services/script';
import { ProjectScript, ScriptScene, SceneVideo } from '../types';
import { syncSceneVideoToLocal } from '../services/localDataService';
import VideoDetailDrawer from '../components/scene-videos/VideoDetailDrawer';

export default function SceneVideosPage() {
  const { id, scriptId, sceneId } = useParams<{ id: string; scriptId: string; sceneId: string }>();
  const navigate = useNavigate();

  const [script, setScript] = useState<ProjectScript | null>(null);
  const [scene, setScene] = useState<ScriptScene | null>(null);
  const [videos, setVideos] = useState<SceneVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 抽屉状态
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SceneVideo | null>(null);

  // 操作状态
  const [selectingVideoId, setSelectingVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  // 初始加载数据
  const loadData = useCallback(async () => {
    if (!id || !scriptId || !sceneId) return;
    try {
      setLoading(true);
      const [scriptData, scenesData, videosData] = await Promise.all([
        getScript(id, scriptId),
        getScriptScenes(id, scriptId),
        getSceneVideos(id, scriptId, sceneId),
      ]);
      setScript(scriptData);
      const currentScene = scenesData.find((s: ScriptScene) => s.id === sceneId);
      setScene(currentScene || null);
      setVideos(videosData);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id, scriptId, sceneId]);

  // 静默刷新视频列表（不显示 loading 状态，避免页面闪烁）
  const refreshVideos = useCallback(async () => {
    if (!id || !scriptId || !sceneId) return;
    try {
      const videosData = await getSceneVideos(id, scriptId, sceneId);
      setVideos(videosData);
    } catch (err: any) {
      // 静默刷新失败时不显示错误
      console.error('刷新视频列表失败:', err);
    }
  }, [id, scriptId, sceneId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 轮询更新生成中的视频状态（使用静默刷新）
  useEffect(() => {
    const hasGenerating = videos.some(v => v.status === 'pending' || v.status === 'generating');
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      refreshVideos();
    }, 5000);

    return () => clearInterval(interval);
  }, [videos, refreshVideos]);

  // 同步已完成的视频到本地存储（下载视频文件和缩略图）
  const syncedVideoIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!id || !sceneId) return;
    const completedVideos = videos.filter(
      v => v.status === 'completed' && (v.videoUrl || v.thumbnailUrl) && !syncedVideoIdsRef.current.has(v.id)
    );
    for (const video of completedVideos) {
      syncedVideoIdsRef.current.add(video.id);
      syncSceneVideoToLocal(id, sceneId, video);
    }
  }, [id, sceneId, videos]);

  // 每秒更新已用时间显示
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasGenerating = videos.some(v => v.status === 'pending' || v.status === 'generating');
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [videos]);

  const handleSelectVideo = async (videoId: string) => {
    if (!id || !scriptId || !sceneId) return;
    try {
      setSelectingVideoId(videoId);
      await selectSceneVideo(id, scriptId, sceneId, videoId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || '选择视频失败');
    } finally {
      setSelectingVideoId(null);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!id || !scriptId || !sceneId) return;
    if (!confirm('确定要删除这个视频吗？')) return;
    try {
      setDeletingVideoId(videoId);
      await deleteSceneVideo(id, scriptId, sceneId, videoId);
      await loadData();
      // 如果删除的是当前查看的视频，关闭抽屉
      if (selectedVideo?.id === videoId) {
        setIsDrawerOpen(false);
        setSelectedVideo(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '删除视频失败');
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleViewDetail = (video: SceneVideo) => {
    setSelectedVideo(video);
    setIsDrawerOpen(true);
  };

  const handleRegenerate = (video: SceneVideo) => {
    // 跳转到生成页面
    setIsDrawerOpen(false);
    navigate(`/projects/${id}/script/${scriptId}/scenes/${sceneId}/generate`);
  };

  // 计算已用时间
  const getElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 1000); // 秒

    if (elapsed < 60) {
      return `${elapsed}秒`;
    } else if (elapsed < 3600) {
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      return `${minutes}分${seconds}秒`;
    } else {
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      return `${hours}时${minutes}分`;
    }
  };

  const getStatusLabel = (status: string, errorMessage?: string | null, createdAt?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded flex items-center gap-1">
            等待中
            {createdAt && <span className="text-gray-400">({getElapsedTime(createdAt)})</span>}
          </span>
        );
      case 'generating':
        return (
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            生成中
            {createdAt && <span className="text-blue-400">({getElapsedTime(createdAt)})</span>}
          </span>
        );
      case 'completed':
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded">已完成</span>;
      case 'failed':
        return (
          <span
            className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded flex items-center gap-1 cursor-help"
            title={errorMessage || '生成失败'}
          >
            <AlertCircle className="w-3 h-3" />
            失败
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!script || !scene) return <div className="p-8">数据不存在</div>;

  return (
    <>
      <div className="px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
        {/* 第一行：返回按钮 + 面包屑导航 */}
        <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
          <button
            onClick={() => navigate(`/projects/${id}/script/${scriptId}`)}
            className="flex items-center gap-1 hover:text-slate-900 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <span className="text-slate-400">/</span>
          <button
            onClick={() => navigate(`/projects/${id}/script/${scriptId}`)}
            className="hover:text-slate-900 cursor-pointer transition-colors"
          >
            {script.title}
          </button>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-medium">场景视频列表</span>
        </div>

        {/* 第二行：场景信息 + 操作按钮 */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-900">
              {scene.title}
            </h1>
            {scene.duration && (
              <span className="text-sm text-slate-500">({scene.duration}s)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/projects/${id}/script/${scriptId}/scenes/${sceneId}/generate`)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              生成新视频
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">关闭</button>
          </div>
        )}

        {/* 视频网格 */}
        {videos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-4">
              <Play className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-slate-600 mb-4">还没有生成视频，点击按钮开始生成</p>
            <button
              onClick={() => navigate(`/projects/${id}/script/${scriptId}/scenes/${sceneId}/generate`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              生成新视频
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {videos.map((video) => (
              <div
                key={video.id}
                className="group bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* 缩略图区域 */}
                <div className="relative aspect-video bg-slate-100">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt="视频缩略图"
                      className="w-full h-full object-cover"
                    />
                  ) : video.videoUrl && video.status === 'completed' ? (
                    <video
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : video.status === 'failed' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                      <AlertCircle className="w-8 h-8 text-red-400 mb-1" />
                      <span className="text-xs text-red-500">生成失败</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {video.status === 'generating' || video.status === 'pending' ? (
                        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                      ) : (
                        <Play className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                  )}

                  {/* 已选中标记 */}
                  {video.isSelected && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}

                  {/* 悬停操作按钮 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {video.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleViewDetail(video)}
                          className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4 text-slate-700" />
                        </button>
                        {!video.isSelected && (
                          <button
                            onClick={() => handleSelectVideo(video.id)}
                            disabled={selectingVideoId === video.id}
                            className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                            title="选择此视频"
                          >
                            {selectingVideoId === video.id ? (
                              <Loader2 className="w-4 h-4 text-slate-700 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerate(video)}
                          className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                          title="重新生成"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-700" />
                        </button>
                      </>
                    )}
                    {/* 失败状态：显示查看详情和重新生成按钮 */}
                    {video.status === 'failed' && (
                      <>
                        <button
                          onClick={() => handleViewDetail(video)}
                          className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4 text-slate-700" />
                        </button>
                        <button
                          onClick={() => handleRegenerate(video)}
                          className="p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
                          title="重新生成"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-700" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      disabled={deletingVideoId === video.id}
                      className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="删除"
                    >
                      {deletingVideoId === video.id ? (
                        <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 信息区域 */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    {video.isSelected && (
                      <span className="text-xs text-green-600 font-medium">✓ 已选中</span>
                    )}
                    {getStatusLabel(video.status, video.errorMessage, video.createdAt)}
                  </div>
                  {/* 失败原因显示 */}
                  {video.status === 'failed' && video.errorMessage && (
                    <p
                      className="text-xs text-red-500 mt-1 line-clamp-2 cursor-help"
                      title={video.errorMessage}
                    >
                      {video.errorMessage}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    {video.duration && <span>{video.duration}s</span>}
                    <span>•</span>
                    <span>{new Date(video.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 视频详情抽屉 */}
      <VideoDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
        onSelect={handleSelectVideo}
        onDelete={handleDeleteVideo}
        onRegenerate={handleRegenerate}
        selectingVideoId={selectingVideoId}
        deletingVideoId={deletingVideoId}
      />
    </>
  );
}
