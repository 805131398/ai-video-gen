import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function PersonalInfo() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      {/* 个人信息卡片 */}
      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">个人信息</CardTitle>
          <CardDescription>
            查看您的账户基本信息
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 用户头像和名称 */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {user?.username || '未设置'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                用户 ID: {user?.id}
              </p>
            </div>
          </div>

          {/* 联系信息 */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            {user?.email && (
              <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    邮箱地址
                  </Label>
                  <p className="text-sm text-slate-900 dark:text-white mt-1 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

          </div>
        </CardContent>
      </Card>      {/* 账户操作卡片 */}
      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">账户操作</CardTitle>
          <CardDescription>
            管理您的账户安全
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full transition-all hover:shadow-lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
                <AlertDialogDescription>
                  退出后需要重新登录才能使用应用。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  确认退出
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div >
  );
}
