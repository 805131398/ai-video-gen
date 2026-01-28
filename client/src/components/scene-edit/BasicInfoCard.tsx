import { FileText } from 'lucide-react';

interface BasicInfoCardProps {
  formData: {
    title?: string;
    description?: string;
    duration?: number;
  };
  onChange: (field: string, value: any) => void;
}

export default function BasicInfoCard({ formData, onChange }: BasicInfoCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20">
      {/* 卡片标题栏 */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">基本信息</h3>
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="p-6 space-y-4">
        {/* 场景标题 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
            场景标题 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={formData.title || ''}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="输入场景标题"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* 场景描述 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
            场景描述
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="描述场景内容、氛围、关键元素..."
            rows={5}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-slate-900 placeholder-slate-400 resize-none"
          />
        </div>

        {/* 场景时长 */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-2">
            场景时长（秒）
          </label>
          <div className="flex items-center gap-4">
            <input
              id="duration"
              type="number"
              value={formData.duration || 0}
              onChange={(e) => onChange('duration', parseInt(e.target.value) || 0)}
              min="0"
              step="1"
              className="w-32 px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors duration-200 text-slate-900"
            />
            <input
              type="range"
              value={formData.duration || 0}
              onChange={(e) => onChange('duration', parseInt(e.target.value))}
              min="0"
              max="60"
              step="1"
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm text-slate-600 w-16 text-right">
              {Math.floor((formData.duration || 0) / 60)}:{String((formData.duration || 0) % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
