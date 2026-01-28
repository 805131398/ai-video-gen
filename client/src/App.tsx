import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Agentation } from 'agentation';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectManagement from './pages/ProjectManagement';
import ProjectNew from './pages/ProjectNew';
import ProjectDetail from './pages/ProjectDetail';
import ProjectScripts from './pages/ProjectScripts';
import ProjectScript from './pages/ProjectScript';
import ScriptEditor from './pages/ScriptEditor';
import SceneEdit from './pages/SceneEdit';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './store/auth';
import { getUserProfile, getSubscriptionStatus } from './services/auth';

function App() {
  const { isAuthenticated, login } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // 页面加载时恢复认证状态
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token && !isAuthenticated) {
        try {
          // 尝试获取用户信息和订阅状态
          const [user, subscription] = await Promise.all([
            getUserProfile(),
            getSubscriptionStatus(),
          ]);
          login(user, subscription);
        } catch (error) {
          // Token 无效，清除本地存储
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsInitializing(false);
    };

    initAuth();
  }, [isAuthenticated, login]);

  // 初始化期间显示加载状态
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<Navigate to="/projects" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<ProjectManagement />} />
            <Route path="projects/new" element={<ProjectNew />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/:id/scripts" element={<ProjectScripts />} />
            <Route path="projects/:id/scripts/new" element={<ScriptEditor />} />
            <Route path="projects/:id/scripts/:scriptId/edit" element={<ScriptEditor />} />
            <Route path="projects/:id/script/:scriptId" element={<ProjectScript />} />
            <Route path="projects/:id/script/:scriptId/scenes/:sceneId/edit" element={<SceneEdit />} />
            <Route path="activate" element={<Navigate to="/projects" />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Agentation />
    </>
  );
}

export default App;
