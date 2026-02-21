import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Edit, Trash2, Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getProjects } from '../../services/project';
import { getProjectScripts, deleteScript, getVideosGenerationStatus } from '../../services/script';
import { Project, ProjectScript } from '../../types';

interface ScriptWithProject extends ProjectScript {
    projectName: string;
}

export default function ScriptManagement() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [scripts, setScripts] = useState<ScriptWithProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [videoStatuses, setVideoStatuses] = useState<Record<string, any>>({});

    // Filter states
    const [searchWord, setSearchWord] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const projectsData = await getProjects();
            setProjects(projectsData);

            const allScripts: ScriptWithProject[] = [];
            const projectScriptIds: Record<string, string[]> = {};

            await Promise.all(
                projectsData.map(async (project) => {
                    try {
                        const projectScripts = await getProjectScripts(project.id);
                        const scriptsWithProject = projectScripts.map(script => ({
                            ...script,
                            projectName: project.title || project.topic,
                        }));
                        allScripts.push(...scriptsWithProject);
                        projectScriptIds[project.id] = scriptsWithProject.map(s => s.id);
                    } catch (err) {
                        console.error(`Failed to load scripts for project ${project.id}`);
                    }
                })
            );

            // Sort by update time
            allScripts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setScripts(allScripts);

            // Load video statuses
            await loadVideoStatuses(allScripts);

        } catch (err: any) {
            setError(err.response?.data?.message || '加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadVideoStatuses = async (scriptsList: ScriptWithProject[]) => {
        const statuses: Record<string, any> = {};

        // For better performance, we shouldn't blast the server with too many requests 
        // if there are hundreds of scripts. But here we assume manageable number.
        for (const script of scriptsList) {
            try {
                const status = await getVideosGenerationStatus(script.projectId, script.id);
                statuses[script.id] = status;
            } catch (err) {
                // Some scripts may not have status or error out
            }
        }

        setVideoStatuses(prev => ({ ...prev, ...statuses }));
    };

    // 轮询机制：检查是否有正在生成的视频
    useEffect(() => {
        const hasGenerating = Object.values(videoStatuses).some(
            (status) => status?.overallStatus === 'generating'
        );

        if (!hasGenerating || scripts.length === 0) return;

        // 每 10 秒轮询一次
        const interval = setInterval(async () => {
            try {
                const generatingScripts = scripts.filter(s => videoStatuses[s.id]?.overallStatus === 'generating');
                if (generatingScripts.length > 0) {
                    await loadVideoStatuses(generatingScripts);
                }
            } catch (err) {
                console.error('轮询失败:', err);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [videoStatuses, scripts]);

    const handleDeleteScript = async (script: ScriptWithProject) => {
        if (!confirm(`确定要删除剧本 "${script.title}" 吗？`)) return;
        try {
            await deleteScript(script.projectId, script.id);
            setScripts(scripts.filter((s) => s.id !== script.id));
        } catch (err: any) {
            setError(err.response?.data?.error || '删除剧本失败');
        }
    };

    const filteredScripts = useMemo(() => {
        return scripts.filter(script => {
            const matchProject = selectedProjectId === 'all' || script.projectId === selectedProjectId;
            const matchSearch = script.title?.toLowerCase().includes(searchWord.toLowerCase()) ||
                (script.description && script.description.toLowerCase().includes(searchWord.toLowerCase())) ||
                (script.character?.name && script.character.name.toLowerCase().includes(searchWord.toLowerCase()));
            return matchProject && matchSearch;
        });
    }, [scripts, selectedProjectId, searchWord]);

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-600">加载中...</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* 标题 */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1E293B] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        剧本管理
                    </h1>
                    <p className="text-[#64748B]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                        管理所有项目中的剧本
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {error}
                </div>
            )}

            {/* 筛选过滤区 */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="搜索剧本标题或描述、关联角色..."
                        value={searchWord}
                        onChange={(e) => setSearchWord(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-64 flex items-center gap-2">
                    <Filter className="w-5 h-5 text-slate-500" />
                    <select
                        className="block w-full py-2 px-3 border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                    >
                        <option value="all">所有项目</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title || p.topic}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 剧本列表 */}
            {filteredScripts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="text-slate-400 mb-4">
                        <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    </div>
                    <p className="text-slate-600 mb-2 font-medium">没有找到匹配的剧本</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase max-w-xs">
                                        剧本标题
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">
                                        所属项目
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">
                                        关联角色
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">
                                        场景数
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">
                                        视频状态
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-[#64748B] uppercase">
                                        版本
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#64748B] uppercase">
                                        更新时间
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#64748B] uppercase">
                                        操作
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                                {filteredScripts.map((script) => (
                                    <tr
                                        key={script.id}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/projects/${script.projectId}/script/${script.id}`)}
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
                                            <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium max-w-[150px] truncate" title={script.projectName}>
                                                {script.projectName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                <span className="text-sm text-slate-700 truncate max-w-[120px]" title={script.character?.name}>
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
                                                                部分 ({videoStatuses[script.id].completedScenes}/{videoStatuses[script.id].totalScenes})
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
                                                        navigate(`/projects/${script.projectId}/script/${script.id}`);
                                                    }}
                                                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer"
                                                    title="编辑剧本"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteScript(script);
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
                </div>
            )}
        </div>
    );
}
