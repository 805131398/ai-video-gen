import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createProject } from '../services/project';

export default function ProjectNew() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const project = await createProject({ topic });
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '创建项目失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        返回项目列表
      </button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">创建新项目</h1>

        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                项目主题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：健康养生知识分享"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                简短描述项目的主题方向
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? '创建中...' : '创建项目'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
