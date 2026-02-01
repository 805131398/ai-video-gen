import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Calendar, Clock } from 'lucide-react';
import { activateCode, getActivationHistory, getSubscriptionStatus } from '@/services/auth';
import { ActivationRecord } from '@/types';

export default function SubscriptionManagement() {
  const { subscription, updateSubscription } = useAuthStore();
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '未知';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  };

  const getSubscriptionTypeLabel = (type: string | undefined) => {
    switch (type) {
      case 'monthly':
        return '月卡';
      case 'quarterly':
        return '季卡';
      case 'yearly':
        return '年卡';
      default:
        return '未订阅';
    }
  };

  return (
    <div className="space-y-6">
      {/* 订阅状态卡片 */}
      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">订阅状态</CardTitle>
          <CardDescription>
            查看您的订阅信息和有效期
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                subscription?.is_active
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {subscription?.is_active ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {subscription?.is_active ? '订阅有效' : '订阅已过期'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {getSubscriptionTypeLabel(subscription?.type)}
                </p>
              </div>
            </div>
            <Badge
              variant={subscription?.is_active ? 'default' : 'secondary'}
              className="px-3 py-1"
            >
              {subscription?.is_active ? '活跃' : '未激活'}
            </Badge>
          </div>

          {subscription?.is_active && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    到期时间
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {formatDate(subscription.expires_at)}
                  </p>
                </div>
              </div>

              {subscription.days_remaining !== undefined && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      剩余天数
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                      {subscription.days_remaining} 天
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 激活卡密区域 */}
      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">激活卡密</CardTitle>
          <CardDescription>
            输入激活码以激活或续费订阅
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activation-code" className="text-sm font-medium">
                激活码
              </Label>
              <Input
                id="activation-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="font-mono transition-all"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-900/50">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full transition-all hover:shadow-lg"
            >
              {loading ? '激活中...' : '激活'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 激活历史 */}
      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">激活历史</CardTitle>
          <CardDescription>
            查看激活码使用记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                      {record.code.substring(0, 4)}-****-****-{record.code.substring(record.code.length - 4)}
                    </span>
                    <Badge variant="outline" className="font-medium">
                      {getSubscriptionTypeLabel(record.type)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        激活时间
                      </span>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                        {new Date(record.activated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        到期时间
                      </span>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                        {new Date(record.expires_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                暂无激活记录
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
