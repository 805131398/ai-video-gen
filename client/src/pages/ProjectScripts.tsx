import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Edit, Trash2, Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getProject, getProjectCharacters } from '../services/project';
import { getProjectScripts, deleteScript, getVideosGenerationStatus } from '../services/script';
import { Project, ProjectCharacter, ProjectScript } from '../types';

export default function ProjectScripts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [scripts, setScripts] = useState<ProjectScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoStatuses, setVideoStatuses] = useState<Record<string, any>>({});

  const loadData = async () => {
    if (!id) return;
    try {
      const [projectData, charactersData, scriptsData] = await Promise.all([
        getProject(id),
        getProjectCharacters(id),
        getProjectScripts(id),
      ]);
      setProject(projectData);
      setCharacters(charactersData);
      setScripts(scriptsData);

      // 加载每个剧本的视频状态
      await loadVideoStatuses(scriptsData);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载视频状态
  const loadVideoStatuses = async (scriptsList: ProjectScript[]) => {
    if (!id) return;
    const statuses: Record<string, any> = {};

    for (const script of scriptsList) {
      try {
        const status = await getVideosGenerationStatus(id, script.id);
        statuses[script.id] = status;
      } catch (err) {
        console.error(`Failed to load video status for script ${script.id}:`, err);
      }
    }

    setVideoStatuses(statuses);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // 轮询机制：检查是否有正在生成的视频
  useEffect(() => {
    const hasGenerating = Object.values(videoStatuses).some(
      (status) => status?.overallStatus === 'generating'
    );

    if (!hasGenerating) return;

    // 每 10 秒轮询一次
    const interval = setInterval(async () => {
      if (!id) return;
      try {
        await loadVideoStatuses(scripts);
      } catch (err) {
        console.error('轮询失败:', err);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [videoStatuses, scripts, id]);

  const handleDeleteScript = async (scriptId: string) => {
    if (!id) return;
    if (!confirm('确定要删除这个剧本吗？')) return;
    try {
      await deleteScript(id, scriptId);
      setScripts(scripts.filter((s) => s.id !== scriptId));
    } catch (err: any) {
      setError(err.response?.data?.error || '删除剧本失败');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!project) return <div className="p-8">项目不存在</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-6 lg:px-8 xl:px-12 py-6 max-w-[1920px] mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 mb-6 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          返回项目列表
        </button>

        {/* 头部信息栏 */}
        <div className="bg-white rounded-xl shadow-sm border-2.5 border-slate-200 px-4 py-3 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{project.topic}</h1>
                {project.title && <p className="text-sm text-slate-600 truncate">{project.title}</p>}
              </div>
              <div className="h-8 w-px bg-slate-300" />
              <h2 className="text-lg font-semibold text-slate-900 whitespace-nowrap">剧本管理</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/projects/${id}`)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Users className="w-4 h-4" />
                角色管理
              </button>
              <button
                onClick={() => navigate(`/projects/${id}/scripts/new`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                创建剧本
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* 剧本列表 */}
        {scripts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-4">
              <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
            </div>
            <p className="text-slate-600 mb-2 font-medium">还没有创建剧本</p>
            <p className="text-sm text-slate-500 mb-4">点击"创建剧本"按钮为角色创建剧本</p>
            {characters.length === 0 && (
              <p className="text-sm text-amber-600">
                提示：请先在<button
                  onClick={() => navigate(`/projects/${id}`)}
                  className="text-blue-600 hover:underline"
                >角色管理</button>中添加角色
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase max-w-xs">
                    剧本标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    关联角色
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    场景数
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    视频状态
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                    版本
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                    更新时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {scripts.map((script) => (
                  <tr
                    key={script.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${id}/script/${script.id}`)}
                  >
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm font-semibold text-slate-900">{script.title}</div>
                      {script.description && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {script.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {script.character?.name || '未知角色'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {script.scenes?.length || 0} 个场景
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {videoStatuses[script.id] ? (
                        <div className="flex items-center justify-center gap-1.5">
                          {videoStatuses[script.id].overallStatus === 'generating' && (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-xs text-blue-600 font-medium">
                                生成中 ({videoStatuses[script.id].completedScenes}/{videoStatuses[script.id].totalScenes})
                              </span>
                            </>
                          )}
                          {videoStatuses[script.id].overallStatus === 'completed' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-600 font-medium">已完成</span>
                            </>
                          )}
                          {videoStatuses[script.id].overallStatus === 'failed' && (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-xs text-red-600 font-medium">生成失败</span>
                            </>
                          )}
                          {videoStatuses[script.id].overallStatus === 'partial' && (
                            <>
                              <CheckCircle className="w-4 h-4 text-amber-600" />
                              <span className="text-xs text-amber-600 font-medium">
                                部分完成 ({videoStatuses[script.id].completedScenes}/{videoStatuses[script.id].totalScenes})
                              </span>
                            </>
                          )}
                          {videoStatuses[script.id].overallStatus === 'not_started' && (
                            <span className="text-xs text-slate-400">未生成</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-slate-600">v{script.version}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">{formatDate(script.updatedAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${id}/script/${script.id}`);
                          }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="编辑剧本"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScript(script.id);
                          }}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="删除剧本"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
