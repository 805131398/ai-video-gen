import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
      {!isCollapsed && (
        <h1 className="text-lg font-semibold text-slate-900 transition-opacity duration-200">
          AI 视频生成器
        </h1>
      )}
      <button
        onClick={onToggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
        aria-label={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        )}
      </button>
    </div>
  );
}
