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
      <Card>
        <CardHeader>
          <CardTitle>订阅状态</CardTitle>
          <CardDescription>
            查看您的订阅信息和有效期
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {subscription?.is_active ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <p className="font-medium">
                  {subscription?.is_active ? '订阅有效' : '订阅已过期'}
                </p>
                <p className="text-sm text-slate-500">
                  {getSubscriptionTypeLabel(subscription?.type)}
                </p>
              </div>
            </div>
            <Badge variant={subscription?.is_active ? 'default' : 'secondary'}>
              {subscription?.is_active ? '活跃' : '未激活'}
            </Badge>
          </div>

          {subscription?.is_active && (
            <>
              <div className="flex items-center gap-3 pt-4 border-t">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">到期时间</p>
                  <p className="text-sm font-medium">
                    {formatDate(subscription.expires_at)}
                  </p>
                </div>
              </div>

              {subscription.days_remaining !== undefined && (
                <div className="flex items-center gap-3 pt-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500">剩余天数</p>
                    <p className="text-sm font-medium">
                      {subscription.days_remaining} 天
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 激活卡密区域 */}
      <Card>
        <CardHeader>
          <CardTitle>激活卡密</CardTitle>
          <CardDescription>
            输入激活码以激活或续费订阅
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activation-code">激活码</Label>
              <Input
                id="activation-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-500 bg-green-50 p-3 rounded-md">
                {success}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? '激活中...' : '激活'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 激活历史 */}
      <Card>
        <CardHeader>
          <CardTitle>激活历史</CardTitle>
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
                  className="border border-slate-200 rounded-lg p-4 space-y-2 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium">
                      {record.code.substring(0, 4)}-****-****-{record.code.substring(record.code.length - 4)}
                    </span>
                    <Badge variant="outline">
                      {getSubscriptionTypeLabel(record.type)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div>
                      <span className="text-xs text-slate-500">激活时间</span>
                      <p className="font-medium">
                        {new Date(record.activated_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">到期时间</span>
                      <p className="font-medium">
                        {new Date(record.expires_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">暂无激活记录</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
