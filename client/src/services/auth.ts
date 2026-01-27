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
  return response.data;
}

// 查询订阅状态
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await api.get('/activation/status');
  return response.data;
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
