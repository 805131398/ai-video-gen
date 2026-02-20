import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { createCharacter } from '../services/project';
import { CreateCharacterRequest } from '../types';
import { useToast } from '../hooks/use-toast';

export default function CharacterNew() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const handleBack = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}`);
  };

  const handleCancel = () => {
    handleBack();
  };

  const handleSave = async (returnToList: boolean) => {
    if (!projectId) return;
    if (!name.trim() || !description.trim()) {
      setError('请填写必填字段');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data: CreateCharacterRequest = {
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        sortOrder: 0,
      };

      const savedCharacter = await createCharacter(projectId, data);

      toast({
        title: '创建成功',
        description: '角色已成功创建',
      });

      if (returnToList) {
        // 保存并返回列表
        navigate(`/projects/${projectId}`);
      } else {
        // 保存后跳转到编辑页面的数字人 tab
        navigate(`/projects/${projectId}/characters/${savedCharacter.id}/edit#digital-human`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败，请重试');
      toast({
        title: '创建失败',
        description: err.response?.data?.message || '请重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <div className="ml-4 text-sm text-gray-500 flex items-center gap-1">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="hover:text-gray-900 cursor-pointer transition-colors"
              >
                项目详情
              </button>
              <span>&gt;</span>
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="hover:text-gray-900 cursor-pointer transition-colors"
              >
                角色管理
              </button>
              <span>&gt;</span>
              <span className="text-gray-900">新建角色</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">新建角色</h1>

        {/* 表单区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form className="space-y-6">
            {/* 角色名称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：健康专家"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* 角色描述 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                角色描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="详细描述角色的外貌、性格、穿着等特征，帮助 AI 保持一致性"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                详细描述角色的外貌、性格、穿着等特征，帮助 AI 保持一致性
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading || !name.trim() || !description.trim()}
              className="px-6 py-2 text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? '保存中...' : '保存并返回'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading || !name.trim() || !description.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
