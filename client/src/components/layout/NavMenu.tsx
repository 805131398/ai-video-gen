import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Video, BarChart3, FolderKanban, Settings, Users, FileText,
  Wrench, ChevronDown, ChevronRight, MessageSquare, Image,
  Music, Bot,
} from 'lucide-react';

interface NavMenuProps {
  isCollapsed: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  disabled?: boolean;
  badge?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'projects',
    label: '项目管理',
    icon: FolderKanban,
    path: '/projects',
  },
  {
    id: 'characters',
    label: '角色管理',
    icon: Users,
    path: '/characters',
  },
  {
    id: 'scripts',
    label: '剧本管理',
    icon: FileText,
    path: '/scripts',
  },
  {
    id: 'stats',
    label: '使用统计',
    icon: BarChart3,
    path: '/stats',
  },
  {
    id: 'ai-tools-group',
    label: 'AI 工具',
    icon: Bot,
    path: '/ai-chat',
    children: [
      { id: 'ai-chat-text', label: '对话', icon: MessageSquare, path: '/ai-chat?type=text_chat' },
      { id: 'ai-chat-image', label: '图片', icon: Image, path: '/ai-chat?type=image_gen' },
      { id: 'ai-chat-video', label: '视频', icon: Video, path: '/ai-chat?type=video_gen' },
      { id: 'ai-chat-music', label: '音乐', icon: Music, path: '/ai-chat?type=music_gen' },
    ],
  },
  {
    id: 'ai-tools',
    label: 'AI 模型配置',
    icon: Wrench,
    path: '/ai-tools',
  },
  {
    id: 'profile',
    label: '个人中心',
    icon: Settings,
    path: '/profile',
  },
];

export default function NavMenu({ isCollapsed }: NavMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['ai-tools-group']));

  const currentPath = location.pathname + location.search;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClick = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.children) {
      if (isCollapsed) return;
      toggleExpand(item.id);
      // 有 path 的父项同时导航
      if (item.path) navigate(item.path);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const isActive = (item: MenuItem): boolean => {
    if (item.path) {
      if (item.path.includes('?')) {
        return currentPath === item.path;
      }
      // 有子项的父菜单：仅当路径完全匹配（无 query）时才高亮自身
      if (item.children) {
        return location.pathname === item.path && !location.search;
      }
      return location.pathname === item.path;
    }
    if (item.children) {
      return item.children.some((child) => isActive(child));
    }
    return false;
  };

  const renderItem = (item: MenuItem, depth = 0) => {
    const Icon = item.icon;
    const active = isActive(item);
    const hasChildren = !!item.children;
    const isExpanded = expandedIds.has(item.id);

    return (
      <li key={item.id}>
        <button
          onClick={() => handleClick(item)}
          disabled={item.disabled}
          className={`
            w-full flex items-center gap-3 px-3 py-3 rounded-lg
            transition-colors duration-200
            ${active
              ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
              : item.disabled
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
            }
            ${isCollapsed ? 'justify-center' : ''}
            ${depth > 0 ? 'pl-9 py-2' : ''}
          `}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="text-sm font-medium truncate">
                {item.label}
              </span>
              {item.badge && (
                <span className="text-xs text-slate-400 ml-2">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                isExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
          )}
        </button>
        {hasChildren && isExpanded && !isCollapsed && (
          <ul className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav className="flex-1 p-2 overflow-y-auto">
      <ul className="space-y-1">
        {menuItems.map((item) => renderItem(item))}
      </ul>
    </nav>
  );
}
