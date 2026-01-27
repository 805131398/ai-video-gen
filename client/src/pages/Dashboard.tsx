import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, subscription, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">AI 视频生成器</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            退出登录
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 用户信息卡片 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">用户信息</h2>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">用户名：</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <div>
                <span className="text-gray-600">邮箱：</span>
                <span className="font-medium">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* 订阅状态卡片 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">订阅状态</h2>
            {subscription?.is_active ? (
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600">类型：</span>
                  <span className="font-medium">
                    {subscription.type === 'monthly' && '月卡'}
                    {subscription.type === 'quarterly' && '季卡'}
                    {subscription.type === 'yearly' && '年卡'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">到期时间：</span>
                  <span className="font-medium">{subscription.expires_at}</span>
                </div>
                <div>
                  <span className="text-gray-600">剩余天数：</span>
                  <span className="font-medium">{subscription.days_remaining} 天</span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">您还没有激活订阅</p>
                <button
                  onClick={() => navigate('/activate')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  立即激活
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/activate')}
              className="p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="text-2xl mb-2">🎫</div>
              <div className="text-sm">激活卡密</div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 opacity-50 cursor-not-allowed">
              <div className="text-2xl mb-2">🎬</div>
              <div className="text-sm">创建视频</div>
              <div className="text-xs text-gray-500">即将上线</div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 opacity-50 cursor-not-allowed">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm">使用统计</div>
              <div className="text-xs text-gray-500">即将上线</div>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 opacity-50 cursor-not-allowed">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-sm">设置</div>
              <div className="text-xs text-gray-500">即将上线</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
