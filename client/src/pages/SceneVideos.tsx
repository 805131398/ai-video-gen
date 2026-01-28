import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Filter, SortAsc, Play, Check, Trash2, RefreshCw, Eye, Loader2 } from 'lucide-react';
import { getScript, getScriptScenes, getSceneVideos, selectSceneVideo, deleteSceneVideo } from '../services/script';
import { ProjectScript, ScriptScene, SceneVideo } from '../types';
import VideoGenerateDialog from '../components/scene-videos/VideoGenerateDialog';
import VideoDetailDrawer from '../components/scene-videos/VideoDetailDrawer';

export default function SceneVideosPage() {
  const { id, scriptId, sceneId } = useParams<{ id: string; scriptId: string; sceneId: string }>();
  const navigate = useNavigate();

  const [script, setScript] = useState<ProjectScript | null>(null);
  const [scene, setScene] = useState<ScriptScene | null>(null);
  const [videos, setVideos] = useState<SceneVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 对话框和抽屉状态
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<SceneVideo | null>(null);

  // 操作状态
  const [selectingVideoId, setSelectingVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 轮询更新生成中的视频状态
  useEffect(() => {
    const hasGenerating = videos.some(v => v.status === 'pending' || v.status === 'generating');
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [videos, loadData]);

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

  const handleGenerateSuccess = () => {
    setIsGenerateDialogOpen(false);
    loadData();
  };

  const handleRegenerate = (video: SceneVideo) => {
    // 打开生成对话框，预填充参数
    setSelectedVideo(video);
    setIsDrawerOpen(false);
    setIsGenerateDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">等待中</span>;
      case 'generating':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          生成中
        </span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded">已完成</span>;
      case 'failed':
        return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded">失败</span>;
      default:
        return null;
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!script || !scene) return <div className="p-8">数据不存在</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
        {/* 第一行：返回按钮 + 面包屑导航 */}
        <div className="flex items-center gap-2 mb-2 text-sm text-slate-600">
          <button
            onClick={() => navigate(`/projects/${id}/script/${scriptId}`)}
            className="flex items-center gap-1 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <span className="text-slate-400">/</span>
          <span className="truncate max-w-[200px]">{script.title}</span>
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
              onClick={() => setIsGenerateDialogOpen(true)}
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
              onClick={() => setIsGenerateDialogOpen(true)}
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
                    {getStatusLabel(video.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
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

      {/* 生成视频对话框 */}
      <VideoGenerateDialog
        isOpen={isGenerateDialogOpen}
        onClose={() => {
          setIsGenerateDialogOpen(false);
          setSelectedVideo(null);
        }}
        projectId={id!}
        scriptId={scriptId!}
        sceneId={sceneId!}
        scene={scene}
        defaultValues={selectedVideo?.metadata}
        onSuccess={handleGenerateSuccess}
      />

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
    </div>
  );
}
