import api from './api';
import { User, Tokens, SubscriptionStatus } from '../types';

// 注册
export async function register(data: {
  username: string;
  email: string;
  password: string;
}): Promise<{ user: User; tokens: Tokens }> {
  const response = await api.post('/auth/register', data);
  return response.data;
}

// 登录
export async function login(data: {
  username: string;
  password: string;
}): Promise<{ user: User; tokens: Tokens; subscription: SubscriptionStatus }> {
  const response = await api.post('/auth/login', data);
  return response.data;
}

// 刷新 token
export async function refreshToken(refreshToken: string): Promise<{ access_token: string }> {
  const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
  return response.data;
}

// 退出登录
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

// 激活卡密
export async function activateCode(code: string): Promise<{ subscription: SubscriptionStatus }> {
  const response = await api.post('/activation/activate', { code });

  // 后端返回格式: { success: true, data: { type, expiresAt, daysAdded } }
  // 需要转换为前端期望的格式
  const { data } = response.data;

  // 计算剩余天数
  const expiresAt = new Date(data.expiresAt);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    subscription: {
      is_active: true,
      type: data.type.toLowerCase() as 'monthly' | 'quarterly' | 'yearly',
      expires_at: data.expiresAt,
      days_remaining: daysRemaining,
    },
  };
}

// 查询订阅状态
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await api.get('/activation/status');
  const { data } = response.data;

  // 转换为前端期望的格式
  if (!data) {
    return {
      is_active: false,
      type: null,
      expires_at: null,
      days_remaining: 0,
    };
  }

  return {
    is_active: data.isActive || false,
    type: data.type?.toLowerCase() || null,
    expires_at: data.expiresAt || null,
    days_remaining: data.daysRemaining || 0,
  };
}

// 获取激活历史
export async function getActivationHistory(): Promise<any[]> {
  const response = await api.get('/activation/history');
  return response.data.records;
}

// 获取用户信息
export async function getUserProfile(): Promise<User> {
  const response = await api.get('/user/profile');
  return response.data.user;
}

// 获取余额
export async function getUserBalance(): Promise<{ balance: number; energy: number }> {
  const response = await api.get('/user/balance');
  return response.data;
}
