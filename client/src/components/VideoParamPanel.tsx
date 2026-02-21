import { ParamField } from '../types';
import { Info } from 'lucide-react';

interface VideoParamPanelProps {
  params: ParamField[];
  values: Record<string, string | number | boolean>;
  onChange: (values: Record<string, string | number | boolean>) => void;
  disabled?: boolean;
}

export default function VideoParamPanel({ params, values, onChange, disabled }: VideoParamPanelProps) {
  const visibleParams = params.filter(p => p.type !== 'file');

  if (visibleParams.length === 0) return null;

  const handleChange = (key: string, value: string | number | boolean) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
      <div className="flex flex-wrap gap-3 items-center">
        {visibleParams.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5 group relative">
            <label className="text-xs text-slate-500 whitespace-nowrap">{p.label}:</label>

            {p.type === 'select' && p.options ? (
              <select
                value={String(values[p.key] ?? p.value)}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = Number(v);
                  handleChange(p.key, isNaN(n) || v === '' ? v : n);
                }}
                disabled={disabled}
                className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {p.options.map(opt => (
                  <option key={String(opt)} value={String(opt)}>
                    {String(opt) || '(空)'}
                  </option>
                ))}
              </select>
            ) : p.type === 'boolean' ? (
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(values[p.key] ?? p.value)}
                  onChange={(e) => handleChange(p.key, e.target.checked)}
                  disabled={disabled}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600">
                  {Boolean(values[p.key] ?? p.value) ? '是' : '否'}
                </span>
              </label>
            ) : p.type === 'number' ? (
              <input
                type="number"
                value={Number(values[p.key] ?? p.value)}
                onChange={(e) => handleChange(p.key, Number(e.target.value))}
                disabled={disabled}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            ) : (
              <input
                type="text"
                value={String(values[p.key] ?? p.value)}
                onChange={(e) => handleChange(p.key, e.target.value)}
                disabled={disabled}
                className="w-28 px-2 py-1 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            )}

            {p.remark && (
              <div className="relative">
                <Info className="w-3 h-3 text-slate-300 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {p.remark}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}