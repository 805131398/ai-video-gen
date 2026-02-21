import { create } from 'zustand';
import { User, SubscriptionStatus } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  subscription: SubscriptionStatus | null;
  login: (user: User, subscription: SubscriptionStatus) => void;
  logout: () => void;
  updateSubscription: (subscription: SubscriptionStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  subscription: null,
  login: (user, subscription) => {
    set({ user, isAuthenticated: true, subscription });
    // 保存用户信息到本地数据库（转换字段名以匹配 Electron 数据库）
    window.electron?.db.saveUser({
      id: user.id,
      username: user.username || user.email || '',
      email: user.email || '',
      created_at: user.created_at || new Date().toISOString()
    });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false, subscription: null });
    // 清除 localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  updateSubscription: (subscription) => {
    set({ subscription });
  },
}));
