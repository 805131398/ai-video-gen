import { useSettingsStore } from '@/store/settings';
import { Button } from '@/components/ui/button';
import { RefreshCw, HardDrive, FileText, Clock } from 'lucide-react';

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

  const handleRefresh = async () => {
    await calculateStorageUsage();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded">
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">已使用空间</p>
            <p className="text-lg font-semibold">
              {formatBytes(storageUsage.totalBytes)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">文件数量</p>
            <p className="text-lg font-semibold">{storageUsage.fileCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <div className="p-2 bg-purple-100 rounded">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">最后更新</p>
            <p className="text-sm font-medium">
              {formatDate(storageUsage.lastCalculated)}
            </p>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
        className="w-full md:w-auto"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? '计算中...' : '刷新'}
      </Button>
    </div>
  );
}
