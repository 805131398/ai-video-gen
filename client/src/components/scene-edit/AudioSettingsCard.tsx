import { Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { SceneContent } from '../../types';

interface AudioSettingsCardProps {
  formData: {
    content?: SceneContent;
  };
  onChange: (field: string, value: any) => void;
  expanded: boolean;
  onToggle: () => void;
}

export default function AudioSettingsCard({
  formData,
  onChange,
  expanded,
  onToggle,
}: AudioSettingsCardProps) {
  const content = formData.content || {};

  const handleAudioChange = (field: string, value: string | number) => {
    onChange('content', {
      ...content,
      audio: {
        ...content.audio,
        [field]: value,
      },
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20">
      {/* 卡片标题栏 */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">音频设置</h3>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* 卡片内容 */}
      {expanded && (
        <div className="p-6 space-y-6">
          {/* 背景音乐 */}
          <div>
            <label htmlFor="bgMusic" className="block text-sm font-medium text-slate-700 mb-2">
              背景音乐
            </label>
            <select
              id="bgMusic"
              value={content.audio?.bgMusic || ''}
              onChange={(e) => handleAudioChange('bgMusic', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-slate-900 cursor-pointer"
            >
              <option value="">无背景音乐</option>
              <option value="calm">轻松舒缓</option>
              <option value="energetic">活力动感</option>
              <option value="dramatic">戏剧紧张</option>
              <option value="romantic">浪漫温馨</option>
              <option value="epic">史诗宏大</option>
            </select>
          </div>

          {/* 音效 */}
          <div>
            <label htmlFor="soundEffects" className="block text-sm font-medium text-slate-700 mb-2">
              音效
            </label>
            <input
              id="soundEffects"
              type="text"
              value={content.audio?.soundEffects || ''}
              onChange={(e) => handleAudioChange('soundEffects', e.target.value)}
              placeholder="例如：脚步声、门铃声、风声"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* 音量控制 */}
          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-slate-700 mb-2">
              音量控制
            </label>
            <div className="flex items-center gap-4">
              <input
                id="volume"
                type="range"
                value={content.audio?.volume || 70}
                onChange={(e) => handleAudioChange('volume', parseInt(e.target.value))}
                min="0"
                max="100"
                step="5"
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                  {content.audio?.volume || 70}%
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              调整背景音乐和音效的整体音量
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
