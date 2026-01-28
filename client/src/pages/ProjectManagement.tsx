import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Calendar, Clock, Eye, Trash2 } from 'lucide-react';
import { getProjects, deleteProject } from '../services/project';
import { Project } from '../types';

export default function ProjectManagement() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.message || '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) {
      return;
    }

    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || '删除项目失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
      in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
      archived: { label: '已归档', className: 'bg-slate-100 text-slate-600' },
    };

    const config = statusMap[status] || statusMap.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            项目管理
          </h1>
          <p className="text-[#64748B]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            管理您的所有视频创作项目
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* 创建新项目按钮 */}
        <button
          onClick={() => navigate('/projects/new')}
          className="w-full mb-6 p-6 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-center gap-3">
            <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
              创建新项目
            </span>
          </div>
        </button>

        {/* 项目列表 */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">还没有项目</p>
            <button
              onClick={() => navigate('/projects/new')}
              className="text-[#2563EB] hover:text-[#1D4ED8] font-medium cursor-pointer"
            >
              创建第一个项目
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl p-6 transition-all duration-200 cursor-pointer group border border-[#E2E8F0]"
              >
                {/* 项目标题和状态 */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1E293B] group-hover:text-[#2563EB] transition-colors flex-1 mr-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {project.title || project.topic}
                  </h3>
                  {getStatusBadge(project.status)}
                </div>

                {/* 项目主题 */}
                {project.title && (
                  <p className="text-sm text-[#64748B] mb-4 line-clamp-2" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    {project.topic}
                  </p>
                )}

                {/* 项目信息 */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Calendar className="w-4 h-4" />
                    <span>创建于 {formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Clock className="w-4 h-4" />
                    <span>更新于 {formatDate(project.updatedAt)}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 pt-4 border-t border-[#E2E8F0]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">查看详情</span>
                  </button>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="删除项目"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

