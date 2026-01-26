import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Settings, Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  // 获取系统统计数据
  const [userCount, roleCount, configCount, notificationCount] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.systemConfig.count({ where: { isActive: true } }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">用户总数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">
              系统注册用户
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">角色数量</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleCount}</div>
            <p className="text-xs text-muted-foreground">
              已配置角色
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统配置</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configCount}</div>
            <p className="text-xs text-muted-foreground">
              活跃配置项
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未读通知</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notificationCount}</div>
            <p className="text-xs text-muted-foreground">
              待处理通知
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">快捷入口</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <a href="/admin/users" className="flex items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <Users className="h-4 w-4" />
                <span className="text-sm">用户管理</span>
              </a>
              <a href="/admin/roles" className="flex items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <Shield className="h-4 w-4" />
                <span className="text-sm">角色管理</span>
              </a>
              <a href="/admin/menus" className="flex items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <Settings className="h-4 w-4" />
                <span className="text-sm">菜单管理</span>
              </a>
              <a href="/admin/configs" className="flex items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors">
                <Settings className="h-4 w-4" />
                <span className="text-sm">系统配置</span>
              </a>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">系统信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">系统版本</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">运行环境</span>
                <span>{process.env.NODE_ENV}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
