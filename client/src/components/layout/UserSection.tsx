import { User } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface UserSectionProps {
  isCollapsed: boolean;
}

export default function UserSection({ isCollapsed }: UserSectionProps) {
  const { user, subscription } = useAuthStore();

  return (
    <div className="p-4 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 transition-all duration-300`}>
          <User className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0 transition-opacity duration-200">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.username}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${subscription?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-xs text-slate-500">
                {subscription?.is_active ? '订阅有效' : '未激活'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
