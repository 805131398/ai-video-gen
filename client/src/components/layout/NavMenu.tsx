import { useNavigate, useLocation } from 'react-router-dom';
import { Video, BarChart3, FolderKanban } from 'lucide-react';

interface NavMenuProps {
  isCollapsed: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  disabled?: boolean;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'projects',
    label: '项目管理',
    icon: FolderKanban,
    path: '/projects',
  },
  {
    id: 'create',
    label: '创建视频',
    icon: Video,
    path: '/create',
    disabled: true,
    badge: '即将上线',
  },
  {
    id: 'stats',
    label: '使用统计',
    icon: BarChart3,
    path: '/stats',
    disabled: true,
    badge: '即将上线',
  },
];

export default function NavMenu({ isCollapsed }: NavMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item: MenuItem) => {
    if (!item.disabled) {
      navigate(item.path);
    }
  };

  return (
    <nav className="flex-1 p-2 overflow-y-auto">
      <ul className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item)}
                disabled={item.disabled}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : item.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:bg-gray-100 cursor-pointer'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
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
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
