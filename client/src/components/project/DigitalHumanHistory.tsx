import { RefreshCw, Check, Loader2, Sparkles, Copy, CheckCheck } from 'lucide-react';
import { useState } from 'react';

interface DigitalHuman {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}

interface DigitalHumanHistoryProps {
  history: DigitalHuman[];
  selectedHumanId?: string;
  loading: boolean;
  generating: boolean;
  onSelect: (humanId: string) => void;
  onRegenerate: () => void;
}

export default function DigitalHumanHistory({
  history,
  selectedHumanId,
  loading,
  generating,
  onSelect,
  onRegenerate,
}: DigitalHumanHistoryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrompt = async (e: React.MouseEvent, prompt: string, humanId: string) => {
    e.stopPropagation(); // 防止触发选择
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(humanId);
      setTimeout(() => setCopiedId(null), 2000); // 2秒后恢复
    } catch (err) {
      console.error('复制失败:', err);
    }
  };
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 p-3">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-2" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg border border-slate-200 p-3 text-gray-400">
        <Sparkles className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm text-center">还没有生成数字人</p>
        <p className="text-xs mt-1 text-center">点击生成按钮开始</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          生成历史 ({history.length})
        </h4>
        <button
          onClick={onRegenerate}
          disabled={generating}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          title="重新生成"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 垂直滚动容器 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {history.map((human) => (
          <div
            key={human.id}
            onClick={() => onSelect(human.id)}
            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
              selectedHumanId === human.id
                ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <img
              src={human.imageUrl}
              alt={`数字人 ${human.id}`}
              className="w-full min-h-[200px] max-h-[100px] object-contain bg-gray-50"
            />
            {selectedHumanId === human.id && (
              <div className="absolute top-2 right-2 p-1.5 bg-blue-500 rounded-full shadow-lg">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {/* Prompt 文本 - 悬浮时显示完整内容 */}
                <div className="relative group/prompt">
                  <p
                    className="text-xs text-white line-clamp-2 cursor-pointer hover:line-clamp-none transition-all"
                    onClick={(e) => handleCopyPrompt(e, human.prompt, human.id)}
                    title="点击复制完整描述"
                  >
                    {human.prompt}
                  </p>

                  {/* 复制按钮 */}
                  <button
                    onClick={(e) => handleCopyPrompt(e, human.prompt, human.id)}
                    className="absolute -top-1 -right-1 p-1.5 bg-white/90 hover:bg-white rounded-md shadow-sm opacity-0 group-hover/prompt:opacity-100 transition-opacity cursor-pointer"
                    title="复制描述"
                  >
                    {copiedId === human.id ? (
                      <CheckCheck className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
