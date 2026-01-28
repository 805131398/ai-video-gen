import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { activateCode, getActivationHistory, getSubscriptionStatus } from '../services/auth';
import { useAuthStore } from '../store/auth';
import { ActivationRecord } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, subscription, updateSubscription, logout } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [history, setHistory] = useState<ActivationRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [records, status] = await Promise.all([
        getActivationHistory(),
        getSubscriptionStatus(),
      ]);
      setHistory(records);
      updateSubscription(status);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { subscription: newSubscription } = await activateCode(code);

      updateSubscription(newSubscription);

      await window.electron?.db.saveActivationCode({
        code,
        type: newSubscription.type!,
        activated_at: new Date().toISOString(),
        expires_at: newSubscription.expires_at!,
      });

      setSuccess('激活成功！');
      setCode('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || '激活失败，请检查激活码');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">个人中心</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/projects/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            创建新项目
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
              <div className="flex items-center">
                <span className="text-green-500 mr-2">●</span>
                <span>订阅有效</span>
              </div>
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
            <div className="text-gray-600">
              <span className="text-red-500 mr-2">●</span>
              未激活
            </div>
          )}
        </div>
      </div>

      {/* 激活卡密区域 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">激活卡密</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">激活码</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {success && (
            <div className="text-green-500 text-sm">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 cursor-pointer"
          >
            {loading ? '激活中...' : '激活'}
          </button>
        </form>
      </div>

      {/* 激活历史 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">激活历史</h2>
        {history.length > 0 ? (
          <div className="space-y-2">
            {history.map((record) => (
              <div key={record.id} className="border-b pb-2 last:border-b-0">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {record.code.substring(0, 4)}-****-****-{record.code.substring(record.code.length - 4)}
                  </span>
                  <span className="text-sm text-gray-600">
                    {record.type === 'monthly' && '月卡'}
                    {record.type === 'quarterly' && '季卡'}
                    {record.type === 'yearly' && '年卡'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  激活时间：{new Date(record.activated_at).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  到期时间：{new Date(record.expires_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-600">暂无激活记录</div>
        )}
      </div>
    </div>
  );
}
