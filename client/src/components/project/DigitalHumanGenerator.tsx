import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Check, Loader2, ZoomIn, Copy, CheckCheck } from 'lucide-react';
import { getDigitalHumans } from '../../services/project';

export interface DigitalHuman {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}

interface DigitalHumanGeneratorProps {
  characterId: string;
  characterName: string;
  characterDescription: string;
  referenceImageUrl?: string;
  selectedHumanId?: string;
  projectId: string;
  onSelect: (humanId: string) => void;
  onGenerate: (description: string, referenceImage?: string, aspectRatio?: string, count?: number) => Promise<void>;
  onHistoryChange?: (history: DigitalHuman[], loading: boolean, generating: boolean) => void;
}

export default function DigitalHumanGenerator({
  characterId,
  characterName,
  characterDescription,
  referenceImageUrl,
  selectedHumanId,
  projectId,
  onSelect,
  onGenerate,
  onHistoryChange,
}: DigitalHumanGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<DigitalHuman[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape'>('portrait');
  const [generateCount, setGenerateCount] = useState<1 | 4 | 8>(1);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // 加载历史数字人
  useEffect(() => {
    const loadHistory = async () => {
      if (!characterId || !projectId) {
        setLoading(false);
        return;
      }

      try {
        const digitalHumans = await getDigitalHumans(projectId, characterId);
        // 按创建时间倒序排列（最新的在前）
        const sorted = digitalHumans.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setHistory(sorted);
      } catch (error) {
        console.error('加载历史数字人失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [characterId, projectId]);

  // 自动选择默认数字人：如果没有选中且有历史记录，选择最后一个（最新的）
  useEffect(() => {
    if (!selectedHumanId && history.length > 0 && !loading) {
      console.log('自动选择最新的数字人:', history[0].id);
      onSelect(history[0].id);
    }
  }, [history, selectedHumanId, loading, onSelect]);

  // 通知父组件历史数据变化
  useEffect(() => {
    if (onHistoryChange) {
      onHistoryChange(history, loading, generating);
    }
  }, [history, loading, generating, onHistoryChange]);

  const handleCopyPrompt = async (e: React.MouseEvent, prompt: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      // 记录生成前的数字人数量
      const beforeCount = history.length;

      // 调用生成接口（会轮询查询），传递比例参数和生成张数
      // 父组件会自动处理角色保存逻辑
      const sizeParam = aspectRatio === 'landscape' ? '1792x1024' : '1024x1792';
      await onGenerate(characterDescription, referenceImageUrl, sizeParam, generateCount);

      // 生成完成后，如果有 characterId，重新加载完整的数字人列表
      if (characterId) {
        const allDigitalHumans = await getDigitalHumans(projectId, characterId);

        // 按创建时间倒序排列（最新的在前）
        const sorted = allDigitalHumans.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // 替换整个历史记录
        setHistory(sorted);

        console.log(`生成完成，从 ${beforeCount} 个增加到 ${sorted.length} 个数字人`);
      }
    } catch (error: any) {
      console.error('生成失败:', error);
      setError(error.message || '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const selectedHuman = history.find((h) => h.id === selectedHumanId);

  return (
    <div className="space-y-6">
      {/* 当前选中的数字人 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 border border-blue-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          当前数字人形象
        </h3>

        {selectedHuman ? (
          <div className="relative group">
            <img
              src={selectedHuman.imageUrl}
              alt={characterName}
              className="w-full max-h-[300px] object-contain rounded-lg shadow-md cursor-pointer transition-transform hover:scale-[1.02] bg-white"
              onClick={() => setPreviewImage(selectedHuman.imageUrl)}
            />
            <button
              onClick={() => setPreviewImage(selectedHuman.imageUrl)}
              className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white"
            >
              <ZoomIn className="w-4 h-4 text-gray-700" />
            </button>
            {/* Prompt 文本 - 悬浮时以浮层显示完整内容 */}
            <div className="mt-1.5 relative group/prompt">
              {/* 截断的文本 */}
              <p
                className="text-xs text-gray-600 line-clamp-2 cursor-pointer"
                onClick={(e) => handleCopyPrompt(e, selectedHuman.prompt)}
                title="点击复制完整描述"
              >
                {selectedHuman.prompt}
              </p>

              {/* 悬浮时显示的完整文本浮层 */}
              <div className="absolute left-0 right-0 top-0 z-10 opacity-0 invisible group-hover/prompt:opacity-100 group-hover/prompt:visible transition-all duration-200 pointer-events-none">
                <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-h-[200px] overflow-y-auto">
                  <p className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {selectedHuman.prompt}
                  </p>
                </div>
              </div>

              {/* 复制按钮 */}
              <button
                onClick={(e) => handleCopyPrompt(e, selectedHuman.prompt)}
                className="absolute -top-1 -right-1 p-1.5 bg-white hover:bg-gray-50 rounded-md shadow-sm border border-gray-200 opacity-0 group-hover/prompt:opacity-100 transition-opacity cursor-pointer z-20"
                title="复制描述"
              >
                {copiedPrompt ? (
                  <CheckCheck className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-[300px] bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400">
            <Sparkles className="w-10 h-10 mb-2" />
            <p className="text-sm">尚未选择数字人形象</p>
            <p className="text-xs mt-1">点击下方按钮生成</p>
          </div>
        )}
      </div>

      {/* 比例选择和生成按钮 */}
      <div className="space-y-3">
        {/* 比例选择器 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            图片比例
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAspectRatio('portrait')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                aspectRatio === 'portrait'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-12 border-2 border-current rounded"></div>
                <span className="text-xs font-medium">竖屏 9:16</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAspectRatio('landscape')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                aspectRatio === 'landscape'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-8 border-2 border-current rounded"></div>
                <span className="text-xs font-medium">横屏 16:9</span>
              </div>
            </button>
          </div>
        </div>

        {/* 生成张数选择器 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            生成张数
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGenerateCount(1)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                generateCount === 1
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">1</span>
                <span className="text-xs font-medium">张</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setGenerateCount(4)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                generateCount === 4
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">4</span>
                <span className="text-xs font-medium">张</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setGenerateCount(8)}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                generateCount === 8
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">8</span>
                <span className="text-xs font-medium">张</span>
              </div>
            </button>
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={generating || !characterName.trim() || !characterDescription.trim()}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI 生成中...（{generateCount} 张）
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成角色数字人（{generateCount} 张）
            </>
          )}
        </button>

        {(!characterName.trim() || !characterDescription.trim()) && (
          <p className="text-sm text-amber-600 text-center">
            💡 请先填写角色名称和描述
          </p>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* 预览模态框 */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewImage}
            alt="预览"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
