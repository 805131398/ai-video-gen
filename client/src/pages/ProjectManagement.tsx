import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, FileText, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { getProjects, deleteProject, getProjectCharacters, updateProject } from '../services/project';
import { getProjectScripts } from '../services/script';
import { Project } from '../types';
import ProjectEditModal from '../components/project/ProjectEditModal';

export default function ProjectManagement() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectStats, setProjectStats] = useState<Record<string, { characters: number; scripts: number }>>({});
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data);

      // 加载每个项目的角色和剧本数量
      const stats: Record<string, { characters: number; scripts: number }> = {};
      await Promise.all(
        data.map(async (project) => {
          try {
            const [characters, scripts] = await Promise.all([
              getProjectCharacters(project.id),
              getProjectScripts(project.id),
            ]);
            stats[project.id] = {
              characters: characters.length,
              scripts: scripts.length,
            };
          } catch (err) {
            stats[project.id] = { characters: 0, scripts: 0 };
          }
        })
      );
      setProjectStats(stats);
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
      const newStats = { ...projectStats };
      delete newStats[id];
      setProjectStats(newStats);
    } catch (err: any) {
      alert(err.response?.data?.message || '删除项目失败');
    }
  };

  const handleEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (data: { title?: string; topic: string; status: string }) => {
    if (!editingProject) return;

    try {
      const updated = await updateProject(editingProject.id, data);
      setProjects(projects.map(p => p.id === updated.id ? updated : p));
      setShowEditModal(false);
      setEditingProject(null);
    } catch (err: any) {
      throw err;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      DRAFT: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
      IN_PROGRESS: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
      COMPLETED: { label: '已完成', className: 'bg-green-100 text-green-700' },
      ARCHIVED: { label: '已归档', className: 'bg-slate-100 text-slate-600' },
    };

    const config = statusMap[status] || statusMap.DRAFT;
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
        {/* 页面标题和操作栏 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              项目管理
            </h1>
            <p className="text-[#64748B]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              管理您的所有视频创作项目
            </p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#DC2626] text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">创建新项目</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* 项目表格 */}
        <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    项目名称
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    主题
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    剧本
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {projects.map((project) => {
                  const stats = projectStats[project.id] || { characters: 0, scripts: 0 };
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                      // TODO: 点击跳转到作品列表页面
                      // onClick={() => navigate(`/projects/${project.id}/works`)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-[#1E293B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {project.title || project.topic}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#64748B] max-w-xs truncate" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                          {project.title ? project.topic : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          title="查看角色列表"
                        >
                          <Users className="w-4 h-4" />
                          <span>{stats.characters}个角色</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}/scripts`);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                          title="查看剧本列表"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{stats.scripts}个剧本</span>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#64748B]">
                          {formatDate(project.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleEdit(project, e)}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
                            title="编辑项目"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(project.id, e)}
                            className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="删除项目"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 空状态 */}
          {projects.length === 0 && !loading && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                还没有项目
              </h3>
              <p className="text-[#64748B] mb-6" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                创建您的第一个视频项目开始创作
              </p>
              <button
                onClick={() => navigate('/projects/new')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#DC2626] text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">创建新项目</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 编辑模态框 */}
      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingProject(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

