import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

const PRESET_TONES = [
  '轻松搞笑',
  '悬疑紧张',
  '温情治愈',
  '励志向上',
  '浪漫唯美',
  '惊悚恐怖',
  '科幻未来',
  '历史厚重',
  '青春活力',
];

interface ToneComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ToneCombobox({
  value = '',
  onChange,
  placeholder = '选择或输入脚本基调',
  className = '',
}: ToneComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // 过滤选项
  const filteredTones = searchValue
    ? PRESET_TONES.filter((tone) =>
        tone.toLowerCase().includes(searchValue.toLowerCase())
      )
    : PRESET_TONES;

  // 处理选择
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  // 处理自定义输入
  const handleCustomInput = () => {
    if (searchValue.trim()) {
      onChange(searchValue.trim());
      setOpen(false);
      setSearchValue('');
    }
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchValue('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-left"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-500'}>
          {value || placeholder}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="搜索或输入自定义基调..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomInput();
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredTones.length > 0 ? (
              <div className="p-1">
                {filteredTones.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => handleSelect(tone)}
                    className={`relative flex w-full items-center px-3 py-2 text-sm rounded-lg hover:bg-slate-100 transition-colors ${
                      value === tone ? 'bg-slate-100' : ''
                    }`}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        value === tone ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    {tone}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-slate-500">
                {searchValue ? (
                  <div>
                    <p>未找到匹配项</p>
                    <button
                      type="button"
                      onClick={handleCustomInput}
                      className="mt-2 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      使用 &quot;{searchValue}&quot;
                    </button>
                  </div>
                ) : (
                  <p>请输入搜索内容</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
