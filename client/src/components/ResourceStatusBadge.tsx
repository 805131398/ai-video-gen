import { useState, useEffect } from 'react';
import { Loader2, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { getResourceDownloadStatus, retryResourceDownload } from '../services/localDataService';

interface ResourceStatusBadgeProps {
  resourceType: 'character_avatar' | 'digital_human' | 'scene_video' | 'video_thumbnail';
  resourceId: string;
  onRetrySuccess?: () => void;
}

export default function ResourceStatusBadge({
  resourceType,
  resourceId,
  onRetrySuccess,
}: ResourceStatusBadgeProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);

  useEffect(() => {
    loadStatus();
    // 每 2 秒刷新一次状态（如果正在下载）
    const interval = setInterval(() => {
      if (status?.status === 'downloading') {
        loadStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [resourceType, resourceId, status?.status]);

  const loadStatus = async () => {
    try {
      const s = await getResourceDownloadStatus(resourceType, resourceId);
      setStatus(s);
    } catch (error) {
      console.error('Error loading resource status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const result = await retryResourceDownload(resourceType, resourceId);
      if (result.success) {
        await loadStatus();
        onRetrySuccess?.();
      }
    } catch (error) {
      console.error('Error retrying download:', error);
    } finally {
      setRetrying(false);
    }
  };

  const handleContactSupport = () => {
    setShowContactDialog(true);
  };

  if (loading) {
    return null;
  }

  // 如果已完成或没有状态，不显示
  if (!status || status.status === 'completed') {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {status.status === 'pending' && (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="w-3 h-3 mr-1" />
            等待下载
          </Badge>
        )}

        {status.status === 'downloading' && (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            下载中 {status.progress || 0}%
          </Badge>
        )}

        {status.status === 'failed' && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              <XCircle className="w-3 h-3 mr-1" />
              下载失败
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  重试中
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  重试
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={handleContactSupport}
            >
              联系官方
            </Button>
          </div>
        )}
      </div>

      {/* 联系官方对话框 */}
      <AlertDialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>联系官方技术支持</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>资源下载失败可能是由于网络问题或服务端资源已被清理。</p>
              <div className="space-y-2 text-sm">
                <p className="font-medium">请通过以下方式联系我们：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>客服邮箱: support@example.com</li>
                  <li>技术支持 QQ 群: 123456789</li>
                  <li>微信客服: example_support</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                请提供资源类型和 ID 以便我们快速定位问题：
                <br />
                类型: {resourceType}
                <br />
                ID: {resourceId}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowContactDialog(false)}>
              知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
