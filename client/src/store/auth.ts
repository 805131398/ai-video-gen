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
    // 保存用户信息到本地数据库
    window.electron?.db.saveUser(user);
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
