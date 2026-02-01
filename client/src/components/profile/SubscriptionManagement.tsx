import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Calendar } from 'lucide-react';

export default function SubscriptionManagement() {
  const { subscription } = useAuthStore();

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '未知';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="space-y-6">
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
                  {subscription?.subscription_type || '未订阅'}
                </p>
              </div>
            </div>
            <Badge variant={subscription?.is_active ? 'default' : 'secondary'}>
              {subscription?.is_active ? '活跃' : '未激活'}
            </Badge>
          </div>

          {subscription?.expires_at && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">到期时间</p>
                <p className="text-sm font-medium">
                  {formatDate(subscription.expires_at)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>激活历史</CardTitle>
          <CardDescription>
            查看激活码使用记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            激活历史功能待实现 - 可从 Electron 数据库读取
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
