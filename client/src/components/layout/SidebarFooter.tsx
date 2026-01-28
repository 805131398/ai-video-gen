import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export default function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/dashboard';

  return (
    <div className="p-2 border-t border-slate-200">
      <button
        onClick={() => navigate('/dashboard')}
        className={`
          w-full flex items-center gap-3 px-3 py-3 rounded-lg
          transition-colors duration-200 cursor-pointer
          ${isActive
            ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
            : 'text-slate-600 hover:bg-gray-100'
          }
          ${isCollapsed ? 'justify-center' : ''}
        `}
        title={isCollapsed ? '个人中心' : undefined}
      >
        <User className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && (
          <span className="text-sm font-medium">个人中心</span>
        )}
      </button>
    </div>
  );
}
