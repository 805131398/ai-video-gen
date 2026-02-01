import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/store/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StoragePathConfig from './StoragePathConfig';
import StorageUsageDisplay from './StorageUsageDisplay';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function ClearCacheSection() {
  const { clearCache, storageUsage, isLoading } = useSettingsStore();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const result = await clearCache();

      if (result.success) {
        toast({
          title: '清理成功',
          description: `已删除 ${result.deletedCount} 个文件`,
        });
      } else {
        toast({
          title: '清理失败',
          description: '无法清理缓存文件',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      toast({
        title: '清理失败',
        description: '发生未知错误',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          这将删除所有已保存的图片和视频文件。此操作不可撤销,请谨慎操作。
        </p>
        <div className="flex items-center gap-4">
          <Button
            variant="destructive"
            onClick={() => setShowDialog(true)}
            disabled={isLoading || storageUsage.fileCount === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            清理缓存
          </Button>
          {storageUsage.fileCount === 0 && (
            <span className="text-sm text-slate-500">暂无文件可清理</span>
          )}
        </div>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清理缓存?</AlertDialogTitle>
            <AlertDialogDescription>
              即将删除 <strong>{storageUsage.fileCount}</strong> 个文件,
              总大小约 <strong>{formatBytes(storageUsage.totalBytes)}</strong>。
              <br />
              <br />
              此操作不可撤销,确定要继续吗?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCache}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isClearing ? '清理中...' : '确认清理'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">存储设置</CardTitle>
          <CardDescription>
            配置静态资源(图片、视频)的保存位置
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoragePathConfig />
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">存储使用情况</CardTitle>
          <CardDescription>
            查看当前存储空间占用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageUsageDisplay />
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">清理缓存</CardTitle>
          <CardDescription>
            删除所有已保存的静态资源文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClearCacheSection />
        </CardContent>
      </Card>
    </div>
  );
}
