import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Agentation } from 'agentation';
import TitleBar from './components/TitleBar';
import { useEffect, useState } from 'react';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProjectManagement from './pages/project/ProjectManagement';
import ProjectNew from './pages/project/ProjectNew';
import ProjectDetail from './pages/project/ProjectDetail';
import CharacterNew from './pages/character/CharacterNew';
import CharacterEdit from './pages/character/CharacterEdit';
import CharacterManagement from './pages/character/CharacterManagement';
import ProjectScripts from './pages/project/ProjectScripts';
import ProjectScript from './pages/project/ProjectScript';
import ScriptManagement from './pages/script/ScriptManagement';
import ScriptEditor from './pages/script/ScriptEditor';
import SceneEdit from './pages/scene/SceneEdit';
import SceneVideos from './pages/scene/SceneVideos';
import SceneVideoGenerate from './pages/scene/SceneVideoGenerate';
import Profile from './pages/auth/Profile';
import AiToolManagement from './pages/system/AiToolManagement';
import AiChat from './pages/system/AiChat';
import UsageStats from './pages/system/UsageStats';
import AppLayout from './components/layout/AppLayout';
import { useAuthStore } from './store/auth';
import { getUserProfile, getSubscriptionStatus } from './services/auth';
import { Toaster } from './components/ui/toaster';
import { MiniToastProvider } from './components/ui/mini-toast';

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
    <MiniToastProvider>
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex-1 overflow-hidden relative bg-gray-50">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" />}
            >
              <Route index element={<Navigate to="/projects" />} />
              <Route path="projects" element={<ProjectManagement />} />
              <Route path="projects/new" element={<ProjectNew />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="characters" element={<CharacterManagement />} />
              <Route path="characters/new" element={<CharacterNew />} />
              <Route path="characters/:characterId/edit" element={<CharacterEdit />} />
              <Route path="scripts" element={<ScriptManagement />} />
              <Route path="projects/:id/characters/new" element={<CharacterNew />} />
              <Route path="projects/:id/characters/:characterId/edit" element={<CharacterEdit />} />
              <Route path="projects/:id/scripts" element={<ProjectScripts />} />
              <Route path="projects/:id/scripts/new" element={<ScriptEditor />} />
              <Route path="projects/:id/scripts/:scriptId/edit" element={<ScriptEditor />} />
              <Route path="projects/:id/script/:scriptId" element={<ProjectScript />} />
              <Route path="projects/:id/script/:scriptId/scenes/:sceneId/edit" element={<SceneEdit />} />
              <Route path="projects/:id/script/:scriptId/scenes/:sceneId/videos" element={<SceneVideos />} />
              <Route path="projects/:id/script/:scriptId/scenes/:sceneId/generate" element={<SceneVideoGenerate />} />
              <Route path="profile" element={<Profile />} />
              <Route path="ai-tools" element={<AiToolManagement />} />
              <Route path="ai-chat" element={<AiChat />} />
              <Route path="stats" element={<UsageStats />} />
              <Route path="activate" element={<Navigate to="/projects" />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Agentation />
      </div>
    </div>
    </MiniToastProvider>
  );
}

export default App;
