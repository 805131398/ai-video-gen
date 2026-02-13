import { useSettingsStore } from '@/store/settings';
import { Button } from '@/components/ui/button';
import { RefreshCw, HardDrive, FileText, Clock, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatDate(date: Date | null): string {
  if (!date) return '从未计算';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function StorageUsageDisplay() {
  const { storageUsage, calculateStorageUsage, isLoading } = useSettingsStore();
  const { toast } = useToast();

  const handleRefresh = async () => {
    await calculateStorageUsage();
  };

  const handleOpenFolder = async () => {
    try {
      if (window.electron?.resources?.openFolder) {
        const result = await window.electron.resources.openFolder();
        if (result.success) {
          toast({
            title: '已打开文件夹',
            description: result.path,
          });
        }
      } else {
        toast({
          title: '功能不可用',
          description: '请在 Electron 环境中使用此功能',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('打开文件夹失败:', error);
      toast({
        title: '打开失败',
        description: '无法打开资源文件夹',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="p-2 bg-blue-100 rounded">
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">已使用空间</p>
            <p className="text-lg font-semibold text-slate-900">
              {formatBytes(storageUsage.totalBytes)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="p-2 bg-emerald-100 rounded">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">文件数量</p>
            <p className="text-lg font-semibold text-slate-900">{storageUsage.fileCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="p-2 bg-slate-100 rounded">
            <Clock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">最后更新</p>
            <p className="text-sm font-medium text-slate-900">
              {formatDate(storageUsage.lastCalculated)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex-1 md:flex-none"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '计算中...' : '刷新'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenFolder}
          className="flex-1 md:flex-none"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          打开文件夹
        </Button>
      </div>
    </div>
  );
}
