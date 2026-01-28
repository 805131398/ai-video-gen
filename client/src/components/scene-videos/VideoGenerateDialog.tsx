import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { generateSceneVideo } from '../../services/script';
import { ScriptScene } from '../../types';

interface VideoGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  scriptId: string;
  sceneId: string;
  scene: ScriptScene;
  defaultValues?: {
    promptType?: string;
    useStoryboard?: boolean;
    useCharacterImage?: boolean;
    aspectRatio?: string;
    hd?: boolean;
  };
  onSuccess: () => void;
}

export default function VideoGenerateDialog({
  isOpen,
  onClose,
  projectId,
  scriptId,
  sceneId,
  scene,
  defaultValues,
  onSuccess,
}: VideoGenerateDialogProps) {
  const [promptType, setPromptType] = useState<'smart_combine' | 'ai_optimized'>(
    (defaultValues?.promptType as 'smart_combine' | 'ai_optimized') || 'smart_combine'
  );
  const [useStoryboard, setUseStoryboard] = useState(defaultValues?.useStoryboard ?? false);
  const [useCharacterImage, setUseCharacterImage] = useState(defaultValues?.useCharacterImage ?? true);
  const [aspectRatio, setAspectRatio] = useState(defaultValues?.aspectRatio || '16:9');
  const [hd, setHd] = useState(defaultValues?.hd ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      await generateSceneVideo(projectId, scriptId, sceneId, {
        promptType,
        useStoryboard,
        useCharacterImage,
        aspectRatio,
        hd,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || '生成视频失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 对话框 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">生成新视频</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* 提示词类型 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              提示词类型
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="promptType"
                  value="smart_combine"
                  checked={promptType === 'smart_combine'}
                  onChange={() => setPromptType('smart_combine')}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-slate-700">智能组合 (smart_combine)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="promptType"
                  value="ai_optimized"
                  checked={promptType === 'ai_optimized'}
                  onChange={() => setPromptType('ai_optimized')}
                  className="w-4 h-4 text-purple-600"
                />
                <span className="text-sm text-slate-700">AI优化 (ai_optimized)</span>
              </label>
            </div>
          </div>

          {/* 复选框选项 */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useStoryboard}
                onChange={(e) => setUseStoryboard(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-slate-700">使用故事板格式</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCharacterImage}
                onChange={(e) => setUseCharacterImage(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-slate-700">使用角色形象作为参考图</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hd}
                onChange={(e) => setHd(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-slate-700">高清模式 (HD)</span>
            </label>
          </div>

          {/* 宽高比 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              宽高比
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="16:9">16:9 (横屏)</option>
              <option value="9:16">9:16 (竖屏)</option>
              <option value="1:1">1:1 (方形)</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>
          </div>

          {/* 时长显示 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              时长
            </label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
              {scene.duration || 5}s (继承场景设置)
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            开始生成
          </button>
        </div>
      </div>
    </div>
  );
}
