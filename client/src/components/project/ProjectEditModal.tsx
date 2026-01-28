import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Project } from '../../types';

interface ProjectEditModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title?: string; topic: string; status: string }) => Promise<void>;
}

export default function ProjectEditModal({ project, isOpen, onClose, onSave }: ProjectEditModalProps) {
  const [title, setTitle] = useState(project.title || '');
  const [topic, setTopic] = useState(project.topic);
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(project.title || '');
      setTopic(project.topic);
      setStatus(project.status);
      setError('');
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('请输入项目主题');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        title: title.trim() || undefined,
        topic: topic.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
          <h2 className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            编辑项目
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            disabled={saving}
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 项目主题 */}
          <div>
            <label className="block text-sm font-semibold text-[#1E293B] mb-2">
              项目主题
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="描述项目的主题内容"
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              disabled={saving}
              required
            />
          </div>

          {/* 项目状态 */}
          <div>
            <label className="block text-sm font-semibold text-[#1E293B] mb-2">
              项目状态
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all cursor-pointer"
              disabled={saving}
            >
              <option value="DRAFT">草稿</option>
              <option value="IN_PROGRESS">进行中</option>
              <option value="COMPLETED">已完成</option>
              <option value="ARCHIVED">已归档</option>
            </select>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              disabled={saving}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
