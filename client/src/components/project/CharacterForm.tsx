import { useState, useRef } from 'react';
import { X, Plus, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ProjectCharacter, CreateCharacterRequest } from '../../types';
import { uploadAvatar } from '../../services/storage';
import { generateCharacterDescription } from '../../services/project';

interface CharacterFormProps {
  character?: ProjectCharacter;
  projectId: string;
  onSubmit: (data: CreateCharacterRequest) => Promise<void>;
  onCancel: () => void;
}

export default function CharacterForm({ character, projectId, onSubmit, onCancel }: CharacterFormProps) {
  const [name, setName] = useState(character?.name || '');
  const [description, setDescription] = useState(character?.description || '');
  const [avatarUrl, setAvatarUrl] = useState(character?.avatarUrl || '');
  const [attributes, setAttributes] = useState<Record<string, string>>(
    (character?.attributes as Record<string, string>) || {}
  );
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddAttribute = () => {
    if (newAttrKey.trim() && newAttrValue.trim()) {
      setAttributes({ ...attributes, [newAttrKey.trim()]: newAttrValue.trim() });
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const handleRemoveAttribute = (key: string) => {
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    setAttributes(newAttrs);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const url = await uploadAvatar(file, (progress) => {
        setUploadProgress(progress);
      });
      setAvatarUrl(url);
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
  };

  const handleGenerateDescription = async () => {
    if (!name.trim()) {
      setError('请先输入角色名称');
      return;
    }

    setError('');
    setGenerating(true);

    try {
      const generatedDesc = await generateCharacterDescription(projectId, name.trim());
      setDescription(generatedDesc);
    } catch (err: any) {
      setError(err.response?.data?.error || 'AI 生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl || undefined,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        sortOrder: character?.sortOrder || 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">
        {character ? '编辑角色' : '添加角色'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 头像上传 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            角色头像（可选）
          </label>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt="角色头像"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer"
                  title="删除头像"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {uploading ? (
                  <div className="text-center">
                    <div className="text-xs text-gray-600">{uploadProgress}%</div>
                  </div>
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
            )}
            <div className="flex-1">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {uploading ? '上传中...' : '上传头像'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                支持 JPG、PNG、WEBP 格式，最大 5MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            角色名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：健康专家"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">
              角色描述 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={generating || !name.trim()}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              {generating ? 'AI 生成中...' : 'AI 生成'}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细描述角色的外貌、性格、穿着等特征，帮助 AI 保持一致性"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            详细描述角色的外貌、性格、穿着等特征，帮助 AI 保持一致性
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            角色属性（可选）
          </label>

          {Object.keys(attributes).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(attributes).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                >
                  {key}: {value}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(key)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              placeholder="属性名（如：年龄）"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newAttrValue}
              onChange={(e) => setNewAttrValue(e.target.value)}
              placeholder="属性值（如：中年）"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddAttribute}
              disabled={!newAttrKey.trim() || !newAttrValue.trim()}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim() || !description.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? '保存中...' : '保存角色'}
          </button>
        </div>
      </form>
    </div>
  );
}
