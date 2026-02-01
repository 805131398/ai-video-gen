import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StoragePathConfig from './StoragePathConfig';
import StorageUsageDisplay from './StorageUsageDisplay';

export default function AppSettings() {
  const { initializeStorage, isLoading } = useSettingsStore();

  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>存储设置</CardTitle>
          <CardDescription>
            配置静态资源(图片、视频)的保存位置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoragePathConfig />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>存储使用情况</CardTitle>
          <CardDescription>
            查看当前存储空间占用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageUsageDisplay />
        </CardContent>
      </Card>
    </div>
  );
}
