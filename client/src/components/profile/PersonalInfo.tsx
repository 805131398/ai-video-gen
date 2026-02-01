import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone } from 'lucide-react';

export default function PersonalInfo() {
  const { user } = useAuthStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人信息</CardTitle>
        <CardDescription>
          查看您的账户基本信息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.name || user?.username || '未设置'}</p>
            <p className="text-sm text-slate-500">用户 ID: {user?.id}</p>
          </div>
        </div>

        <div className="space-y-4">
          {user?.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <Label className="text-xs text-slate-500">邮箱</Label>
                <p className="text-sm">{user.email}</p>
              </div>
            </div>
          )}

          {user?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <Label className="text-xs text-slate-500">手机号</Label>
                <p className="text-sm">{user.phone}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
