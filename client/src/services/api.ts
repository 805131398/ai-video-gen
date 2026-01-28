import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 60000, // 增加到 60 秒，适应 AI 生成等耗时操作
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 添加 token
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 过期，尝试刷新
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          localStorage.setItem('access_token', data.access_token);
          // 重试原请求
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        } catch (refreshError) {
          // 刷新失败，跳转到登录页
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
