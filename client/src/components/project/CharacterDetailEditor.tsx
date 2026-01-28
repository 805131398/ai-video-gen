import { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, ArrowLeft } from 'lucide-react';
import { ProjectCharacter, CreateCharacterRequest } from '../../types';
import { uploadAvatar } from '../../services/storage';
import { generateCharacterDescription } from '../../services/project';
import DigitalHumanGenerator, { DigitalHuman } from './DigitalHumanGenerator';
import DigitalHumanHistory from './DigitalHumanHistory';

interface CharacterDetailEditorProps {
  character?: ProjectCharacter;
  projectId: string;
  onSubmit: (data: CreateCharacterRequest, keepEditorOpen?: boolean) => Promise<void>;
  onCancel: () => void;
  hideBottomActions?: boolean; // 是否隐藏底部操作按钮
  onSaveClick?: () => void; // 外部触发保存的回调
}

export default function CharacterDetailEditor({
  character,
  projectId,
  onSubmit,
  onCancel,
  hideBottomActions = false,
  onSaveClick,
}: CharacterDetailEditorProps) {
  const [name, setName] = useState(character?.name || '');
  const [description, setDescription] = useState(character?.description || '');
  const [referenceImageUrl, setReferenceImageUrl] = useState(character?.avatarUrl || '');

  // 从角色的 attributes 中读取已选中的数字人 ID
  const initialDigitalHumanId = character?.attributes?.digitalHumanId as string | undefined;
  const [selectedDigitalHumanId, setSelectedDigitalHumanId] = useState<string | undefined>(initialDigitalHumanId);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 历史数字人状态
  const [digitalHumansHistory, setDigitalHumansHistory] = useState<DigitalHuman[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyGenerating, setHistoryGenerating] = useState(false);

  // 监听外部保存触发
  useEffect(() => {
    if (onSaveClick) {
      // 将保存函数暴露给父组件
      (window as any).__characterEditorSave = async () => {
        if (!name.trim() || !description.trim()) {
          setError('请填写角色名称和描述');
          return false;
        }

        setError('');
        setLoading(true);

        try {
          const updatedAttributes = {
            ...(character?.attributes || {}),
            ...(selectedDigitalHumanId ? { digitalHumanId: selectedDigitalHumanId } : {}),
          };

          await onSubmit({
            name: name.trim(),
            description: description.trim(),
            avatarUrl: referenceImageUrl || undefined,
            attributes: updatedAttributes,
          });
          return true;
        } catch (err: any) {
          setError(err.response?.data?.error || '保存失败，请重试');
          return false;
        } finally {
          setLoading(false);
        }
      };
    }

    return () => {
      delete (window as any).__characterEditorSave;
    };
  }, [name, description, referenceImageUrl, selectedDigitalHumanId, character, onSubmit, onSaveClick]);

  const handleReferenceImageClick = () => {
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
      setReferenceImageUrl(url);
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

  const handleRemoveReferenceImage = () => {
    setReferenceImageUrl('');
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

  const handleGenerateDigitalHumans = async (
    desc: string,
    refImage?: string,
    aspectRatio?: string,
    count?: number
  ): Promise<void> => {
    // 检查是否需要保存
    const needsSave = !character?.id ||
      name.trim() !== character?.name ||
      description.trim() !== character?.description ||
      referenceImageUrl !== character?.avatarUrl;

    if (needsSave) {
      console.log('检测到未保存的修改，先保存角色信息...');

      // 验证必填字段
      if (!name.trim() || !description.trim()) {
        throw new Error('请填写角色名称和描述');
      }

      try {
        // 先保存角色信息，但保持编辑器打开
        await onSubmit({
          name: name.trim(),
          description: description.trim(),
          avatarUrl: referenceImageUrl || undefined,
        }, true); // 传递 true 保持编辑器打开

        console.log('角色信息已保存，开始生成数字人...');

        // 等待一小段时间确保数据已保存
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('保存角色失败:', error);
        throw new Error('保存角色失败，无法生成数字人');
      }
    }

    // 确保有 character.id
    if (!character?.id) {
      throw new Error('角色保存失败，请重试');
    }

    // 调用真实的 API（异步生成）
    try {
      const { generateDigitalHumans, getDigitalHumans } = await import('../../services/project');

      // 启动异步生成，传递比例参数和生成张数
      const result = await generateDigitalHumans(projectId, character.id, count || 1, aspectRatio);
      console.log('生成任务已启动:', result);

      // 记录生成前的数字人数量
      const beforeDigitalHumans = await getDigitalHumans(projectId, character.id);
      const beforeCount = beforeDigitalHumans.length;
      const expectedCount = count || 1;

      // 轮询查询结果（每3秒查询一次，最多查询60次 = 180秒 = 3分钟）
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 等待3秒

        try {
          const digitalHumans = await getDigitalHumans(projectId, character.id);
          const newCount = digitalHumans.length - beforeCount;

          // 如果生成的数量达到预期，说明生成完成
          if (newCount >= expectedCount) {
            console.log(`查询到新生成的数字人: ${newCount} 个（预期 ${expectedCount} 个）`);
            return; // 生成完成，返回
          } else if (newCount > 0) {
            console.log(`已生成 ${newCount}/${expectedCount} 个数字人，继续等待...`);
          }
        } catch (error) {
          console.error('查询数字人失败:', error);
        }

        attempts++;
        console.log(`轮询查询中... (${attempts}/${maxAttempts})`);
      }

      // 超时
      throw new Error('生成超时，请刷新页面查看结果');
    } catch (error) {
      console.error('生成数字人失败:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 保留原有的 attributes，更新 digitalHumanId
      const updatedAttributes = {
        ...(character?.attributes || {}),
        ...(selectedDigitalHumanId ? { digitalHumanId: selectedDigitalHumanId } : {}),
      };

      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        avatarUrl: referenceImageUrl || undefined,
        attributes: Object.keys(updatedAttributes).length > 0 ? updatedAttributes : undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* 头部 */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            {character ? '编辑角色' : '创建新角色'}
          </h3>
          <p className="text-xs text-slate-500">
            填写角色信息并生成数字人形象
          </p>
        </div>
      </div>

      {/* 主体内容 - 三栏布局 */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            {/* 左栏：角色信息编辑 (50%) */}
            <div className="md:col-span-2 lg:col-span-6 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 角色名称 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    角色名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：健康专家"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* 角色参考图 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    角色参考图
                  </label>
                  {referenceImageUrl ? (
                    <div className="relative group max-w-sm">
                      <img
                        src={referenceImageUrl}
                        alt="角色参考图"
                        className="w-full aspect-[4/3] object-cover rounded-lg border-2 border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveReferenceImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={handleReferenceImageClick}
                      className="w-full max-w-sm aspect-[4/3] border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      {uploading ? (
                        <div className="text-center">
                          <div className="text-lg font-semibold text-slate-700 mb-1">
                            {uploadProgress}%
                          </div>
                          <div className="text-sm text-slate-500">上传中...</div>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
                          <span className="text-sm font-medium text-slate-600">
                            点击上传参考图
                          </span>
                          <span className="text-xs text-slate-500 mt-1">
                            支持 JPG、PNG、WEBP，最大 5MB
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {/* 角色描述 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      角色描述 <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={generating || !name.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      {generating ? 'AI 生成中...' : 'AI 生成'}
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="详细描述角色的外貌、性格、穿着等特征，帮助 AI 生成一致的数字人形象"
                    rows={5}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    描述越详细，生成的数字人形象越准确
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* 中栏：数字人生成与选择 (30%) */}
            <div className="md:col-span-2 lg:col-span-4">
              <DigitalHumanGenerator
                projectId={projectId}
                characterId={character?.id || ''}
                characterName={name}
                characterDescription={description}
                referenceImageUrl={referenceImageUrl}
                selectedHumanId={selectedDigitalHumanId}
                onSelect={setSelectedDigitalHumanId}
                onGenerate={handleGenerateDigitalHumans}
                onHistoryChange={(history, loading, generating) => {
                  setDigitalHumansHistory(history);
                  setHistoryLoading(loading);
                  setHistoryGenerating(generating);
                }}
              />
            </div>

            {/* 右栏：历史数字人 (20%) - 固定高度可滚动 */}
            <div className="md:col-span-2 lg:col-span-2 h-[600px] lg:h-[700px]">
              <DigitalHumanHistory
                history={digitalHumansHistory}
                selectedHumanId={selectedDigitalHumanId}
                loading={historyLoading}
                generating={historyGenerating}
                onSelect={setSelectedDigitalHumanId}
                onRegenerate={() => handleGenerateDigitalHumans(description, referenceImageUrl)}
              />
            </div>
          </div>
        </div>

      {/* 底部操作栏 - 可选显示 */}
      {!hideBottomActions && (
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !description.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium shadow-sm"
          >
            {loading ? '保存中...' : '保存角色'}
          </button>
        </div>
      )}
    </div>
  );
}
