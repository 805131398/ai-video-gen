import { useState } from 'react';
import { useSettingsStore } from '@/store/settings';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StoragePathConfig() {
  const { storageConfig, updateStoragePath, isLoading } = useSettingsStore();
  const { toast } = useToast();
  const [localPathType, setLocalPathType] = useState(storageConfig.pathType);
  const [localCustomPath, setLocalCustomPath] = useState(storageConfig.customPath);

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await window.electron.storage.selectFolder();
      if (selectedPath) {
        setLocalCustomPath(selectedPath);
      }
    } catch (error) {
      console.error('Select folder error:', error);
      toast({
        title: '选择文件夹失败',
        description: '无法打开文件夹选择对话框',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateStoragePath(localPathType, localCustomPath);
      toast({
        title: '保存成功',
        description: '存储路径配置已更新',
      });
    } catch (error) {
      console.error('Save path error:', error);
      toast({
        title: '保存失败',
        description: '无法保存存储路径配置',
        variant: 'destructive',
      });
    }
  };

  const hasChanges =
    localPathType !== storageConfig.pathType ||
    localCustomPath !== storageConfig.customPath;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">保存位置</Label>
        <p className="text-sm text-slate-500 mt-1">
          选择静态资源(图片、视频)的保存位置
        </p>
      </div>

      <RadioGroup
        value={localPathType}
        onValueChange={(value) => setLocalPathType(value as any)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="default" id="default" />
          <Label htmlFor="default" className="font-normal cursor-pointer">
            应用数据目录(默认)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="documents" id="documents" />
          <Label htmlFor="documents" className="font-normal cursor-pointer">
            文档目录
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="downloads" id="downloads" />
          <Label htmlFor="downloads" className="font-normal cursor-pointer">
            下载目录
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="custom" id="custom" />
          <Label htmlFor="custom" className="font-normal cursor-pointer">
            自定义路径
          </Label>
        </div>
      </RadioGroup>

      {localPathType === 'custom' && (
        <div className="flex gap-2">
          <Input
            value={localCustomPath}
            onChange={(e) => setLocalCustomPath(e.target.value)}
            placeholder="选择自定义路径"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleSelectFolder}
            disabled={isLoading}
          >
            <FolderOpen className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="pt-2">
        <Label className="text-sm text-slate-500">当前路径</Label>
        <p className="text-sm font-mono bg-slate-50 p-2 rounded mt-1 break-all">
          {storageConfig.currentPath || '未设置'}
        </p>
      </div>

      {hasChanges && (
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? '保存中...' : '保存更改'}
        </Button>
      )}
    </div>
  );
}
