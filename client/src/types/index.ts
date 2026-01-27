// 用户类型
export interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
}

// Token 类型
export interface Tokens {
  access_token: string;
  refresh_token: string;
}

// 订阅状态
export interface SubscriptionStatus {
  is_active: boolean;
  type: 'monthly' | 'quarterly' | 'yearly' | null;
  expires_at: string | null;
  days_remaining: number;
}

// 激活码记录
export interface ActivationRecord {
  id?: number;
  code: string;
  type: 'monthly' | 'quarterly' | 'yearly';
  activated_at: string;
  expires_at: string;
  created_at?: string;
}

// Electron API 类型
export interface ElectronAPI {
  db: {
    getUser: () => Promise<User | null>;
    saveUser: (user: User) => Promise<boolean>;
    saveActivationCode: (code: ActivationRecord) => Promise<boolean>;
    getActivationHistory: () => Promise<ActivationRecord[]>;
  };
  app: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}

// 扩展 Window 接口
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
