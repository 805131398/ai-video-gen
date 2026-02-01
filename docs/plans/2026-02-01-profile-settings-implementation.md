# 个人中心与应用设置功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 在客户端应用中实现个人中心页面,包含个人信息、订阅管理和应用设置三个 Tab,重点实现静态资源保存位置配置和存储管理功能。

**架构:** 使用 React + TypeScript 构建前端页面,Zustand 管理状态,通过 Electron IPC 与主进程通信实现文件系统操作和数据持久化。采用 shadcn/ui 组件库构建 UI,使用 better-sqlite3 存储配置。

**技术栈:** React, TypeScript, React Router v6, Zustand, shadcn/ui, Electron IPC, better-sqlite3

---

## Phase 1: Electron 后端基础设施

### Task 1: 扩展数据库 - 添加设置表

**文件:**
- 修改: `client/electron/database.ts`
- 修改: `client/electron/main.ts`

**Step 1: 在 database.ts 中添加设置表创建代码**

在 `createTables()` 函数中添加:

```typescript
// 应用设置表
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
```

**Step 2: 在 database.ts 中添加设置操作函数**

在文件末尾添加:

```typescript
// 获取设置
export function getSetting(key: string) {
  if (!db) return null;
  const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  return row?.value || null;
}

// 保存设置
export function saveSetting(key: string, value: string) {
  if (!db) return false;
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
    return true;
  } catch (error) {
    console.error('Error saving setting:', error);
    return false;
  }
}
```

**Step 3: 在 main.ts 中导入设置函数**

修改第 3 行的导入:

```typescript
import { initDatabase, getUser, saveUser, saveActivationCode, getActivationHistory, getSetting, saveSetting } from './database';
```

**Step 4: 在 main.ts 的 registerIpcHandlers 函数中添加设置 IPC handlers**

在 `registerIpcHandlers()` 函数中,数据库操作部分后添加:

```typescript
// 设置操作
ipcMain.handle('settings:get', async (_, key: string) => {
  return getSetting(key);
});

ipcMain.handle('settings:save', async (_, key: string, value: string) => {
  return saveSetting(key, value);
});
```

**Step 5: 提交更改**

```bash
git add client/electron/database.ts client/electron/main.ts
git commit -m "feat(electron): 添加应用设置数据库表和 IPC handlers"
```

---

### Task 2: 添加存储相关 IPC Handlers

**文件:**
- 修改: `client/electron/main.ts`

**Step 1: 在 main.ts 顶部添加必要的导入**

在第 2 行后添加:

```typescript
import { dialog } from 'electron';
import fs from 'fs/promises';
```

**Step 2: 在 registerIpcHandlers 函数中添加文件夹选择 handler**

在设置操作后添加:

```typescript
// 存储管理 - 选择文件夹
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择保存位置'
  });
  return result.canceled ? undefined : result.filePaths[0];
});

// 存储管理 - 获取默认路径
ipcMain.handle('storage:getDefaultPath', () => {
  return path.join(app.getPath('userData'), 'media');
});
```

**Step 3: 添加计算文件夹大小的 handler**

继续添加:

```typescript
// 存储管理 - 计算文件夹大小
ipcMain.handle('storage:calculateSize', async (_, folderPath: string) => {
  try {
    let totalBytes = 0;
    let fileCount = 0;

    async function calculateDir(dirPath: string) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          try {
            if (entry.isDirectory()) {
              await calculateDir(fullPath);
            } else {
              const stats = await fs.stat(fullPath);
              totalBytes += stats.size;
              fileCount++;
            }
          } catch (err) {
            // 跳过无法访问的文件
            console.warn(`Skip file: ${fullPath}`, err);
          }
        }
      } catch (err) {
        // 目录不存在或无权限
        console.warn(`Cannot read directory: ${dirPath}`, err);
      }
    }

    await calculateDir(folderPath);
    return { bytes: totalBytes, count: fileCount };
  } catch (error) {
    console.error('Calculate size error:', error);
    return { bytes: 0, count: 0 };
  }
});
```

**Step 4: 添加清理缓存的 handler**

继续添加:

```typescript
// 存储管理 - 清理缓存
ipcMain.handle('storage:clearCache', async (_, folderPath: string) => {
  try {
    let deletedCount = 0;

    async function clearDir(dirPath: string) {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          try {
            if (entry.isDirectory()) {
              await clearDir(fullPath);
              await fs.rmdir(fullPath);
            } else {
              await fs.unlink(fullPath);
              deletedCount++;
            }
          } catch (err) {
            // 跳过正在使用的文件
            console.warn(`Skip file: ${fullPath}`, err);
          }
        }
      } catch (err) {
        console.warn(`Cannot clear directory: ${dirPath}`, err);
      }
    }

    await clearDir(folderPath);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Clear cache error:', error);
    return { success: false, deletedCount: 0 };
  }
});
```

**Step 5: 提交更改**

```bash
git add client/electron/main.ts
git commit -m "feat(electron): 添加存储管理 IPC handlers (选择文件夹、计算大小、清理缓存)"
```

---

### Task 3: 扩展 Preload 脚本

**文件:**
- 修改: `client/electron/preload.ts`

**Step 1: 在 preload.ts 中添加 settings API**

在 `db` 对象后添加:

```typescript
// 设置操作
settings: {
  get: (key: string) => ipcRenderer.invoke('settings:get', key),
  save: (key: string, value: string) => ipcRenderer.invoke('settings:save', key, value),
},
```

**Step 2: 添加 storage API**

继续添加:

```typescript
// 存储管理
storage: {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  getDefaultPath: () => ipcRenderer.invoke('storage:getDefaultPath'),
  calculateSize: (path: string) => ipcRenderer.invoke('storage:calculateSize', path),
  clearCache: (path: string) => ipcRenderer.invoke('storage:clearCache', path),
},
```

**Step 3: 提交更改**

```bash
git add client/electron/preload.ts
git commit -m "feat(electron): 扩展 preload 脚本,暴露设置和存储管理 API"
```

---

## Phase 2: 前端类型定义和状态管理

### Task 4: 扩展 TypeScript 类型定义

**文件:**
- 修改: `client/src/types/index.ts`

**Step 1: 在 types/index.ts 末尾添加存储相关类型**

```typescript
// 存储路径类型
export type StoragePathType = 'default' | 'documents' | 'downloads' | 'custom';

// 存储配置
export interface StorageConfig {
  pathType: StoragePathType;
  customPath: string;
  currentPath: string;
}

// 存储使用情况
export interface StorageUsage {
  totalBytes: number;
  fileCount: number;
  lastCalculated: Date | null;
}
```

**Step 2: 扩展 Window 接口的 electron API 类型**

在文件末尾添加或修改 `declare global` 块:

```typescript
// Electron API 类型扩展
declare global {
  interface Window {
    electron: {
      db: {
        getUser: () => Promise<any>;
        saveUser: (user: any) => Promise<boolean>;
        saveActivationCode: (code: any) => Promise<boolean>;
        getActivationHistory: () => Promise<any[]>;
      };
      settings: {
        get: (key: string) => Promise<string | null>;
        save: (key: string, value: string) => Promise<boolean>;
      };
      storage: {
        selectFolder: () => Promise<string | undefined>;
        getDefaultPath: () => Promise<string>;
        calculateSize: (path: string) => Promise<{ bytes: number; count: number }>;
        clearCache: (path: string) => Promise<{ success: boolean; deletedCount: number }>;
      };
      app: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
    };
  }
}

export {};
```

**Step 3: 提交更改**

```bash
git add client/src/types/index.ts
git commit -m "feat(types): 添加存储管理相关类型定义和 Electron API 类型"
```

---

### Task 5: 创建设置状态管理 Store

**文件:**
- 创建: `client/src/store/settings.ts`

**Step 1: 创建 settings.ts 文件并添加基础结构**

```typescript
import { create } from 'zustand';

export type StoragePathType = 'default' | 'documents' | 'downloads' | 'custom';

interface StorageConfig {
  pathType: StoragePathType;
  customPath: string;
  currentPath: string;
}

interface StorageUsage {
  totalBytes: number;
  fileCount: number;
  lastCalculated: Date | null;
}

interface SettingsState {
  storageConfig: StorageConfig;
  storageUsage: StorageUsage;
  isLoading: boolean;

  // Actions
  initializeStorage: () => Promise<void>;
  updateStoragePath: (pathType: StoragePathType, customPath?: string) => Promise<void>;
  calculateStorageUsage: () => Promise<void>;
  clearCache: () => Promise<{ success: boolean; deletedCount: number }>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  storageConfig: {
    pathType: 'default',
    customPath: '',
    currentPath: '',
  },
  storageUsage: {
    totalBytes: 0,
    fileCount: 0,
    lastCalculated: null,
  },
  isLoading: false,

  // Actions 将在下一步实现
  initializeStorage: async () => {},
  updateStoragePath: async () => {},
  calculateStorageUsage: async () => {},
  clearCache: async () => ({ success: false, deletedCount: 0 }),
}));
```

**Step 2: 实现 initializeStorage 方法**

替换空的 `initializeStorage`:

```typescript
initializeStorage: async () => {
  set({ isLoading: true });
  try {
    // 从数据库读取配置
    const pathType = (await window.electron.settings.get('storage_path_type')) as StoragePathType || 'default';
    const customPath = await window.electron.settings.get('storage_custom_path') || '';

    // 获取实际路径
    let currentPath = '';
    if (pathType === 'custom' && customPath) {
      currentPath = customPath;
    } else {
      currentPath = await window.electron.storage.getDefaultPath();
    }

    set({
      storageConfig: { pathType, customPath, currentPath },
    });

    // 计算存储占用
    await get().calculateStorageUsage();
  } catch (error) {
    console.error('Initialize storage error:', error);
  } finally {
    set({ isLoading: false });
  }
},
```

**Step 3: 实现 updateStoragePath 方法**

替换空的 `updateStoragePath`:

```typescript
updateStoragePath: async (pathType, customPath = '') => {
  set({ isLoading: true });
  try {
    // 保存到数据库
    await window.electron.settings.save('storage_path_type', pathType);
    if (customPath) {
      await window.electron.settings.save('storage_custom_path', customPath);
    }

    // 更新状态
    let currentPath = '';
    if (pathType === 'custom' && customPath) {
      currentPath = customPath;
    } else {
      currentPath = await window.electron.storage.getDefaultPath();
    }

    set({
      storageConfig: { pathType, customPath, currentPath },
    });

    // 重新计算存储占用
    await get().calculateStorageUsage();
  } catch (error) {
    console.error('Update storage path error:', error);
    throw error;
  } finally {
    set({ isLoading: false });
  }
},
```

**Step 4: 实现 calculateStorageUsage 和 clearCache 方法**

替换剩余的空方法:

```typescript
calculateStorageUsage: async () => {
  const { currentPath } = get().storageConfig;
  if (!currentPath) return;

  try {
    const { bytes, count } = await window.electron.storage.calculateSize(currentPath);
    set({
      storageUsage: {
        totalBytes: bytes,
        fileCount: count,
        lastCalculated: new Date(),
      },
    });
  } catch (error) {
    console.error('Calculate storage usage error:', error);
  }
},

clearCache: async () => {
  const { currentPath } = get().storageConfig;
  if (!currentPath) {
    return { success: false, deletedCount: 0 };
  }

  try {
    const result = await window.electron.storage.clearCache(currentPath);

    // 清理后重新计算
    if (result.success) {
      await get().calculateStorageUsage();
    }

    return result;
  } catch (error) {
    console.error('Clear cache error:', error);
    return { success: false, deletedCount: 0 };
  }
},
```

**Step 5: 提交更改**

```bash
git add client/src/store/settings.ts
git commit -m "feat(store): 创建设置状态管理 store,实现存储配置和管理功能"
```

---

## Phase 3: UI 组件 - Profile 页面框架

### Task 6: 创建 Profile 主页面

**文件:**
- 创建: `client/src/pages/Profile.tsx`

**Step 1: 创建 Profile.tsx 文件**

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Profile() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">个人中心</h1>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">个人信息</TabsTrigger>
          <TabsTrigger value="subscription">订阅管理</TabsTrigger>
          <TabsTrigger value="settings">应用设置</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="p-6 border rounded-lg">
            <p className="text-slate-500">个人信息 Tab - 待实现</p>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <div className="p-6 border rounded-lg">
            <p className="text-slate-500">订阅管理 Tab - 待实现</p>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="p-6 border rounded-lg">
            <p className="text-slate-500">应用设置 Tab - 待实现</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 2: 在 App.tsx 中添加路由**

在 `<Route path="activate" ...` 之前添加:

```typescript
<Route path="profile" element={<Profile />} />
```

同时在文件顶部添加导入:

```typescript
import Profile from './pages/Profile';
```

**Step 3: 测试路由是否工作**

启动开发服务器,访问 `/profile` 路径,确认页面显示正常。

**Step 4: 提交更改**

```bash
git add client/src/pages/Profile.tsx client/src/App.tsx
git commit -m "feat(ui): 创建 Profile 页面框架和路由配置"
```

---

### Task 7: 修改 UserSection 添加导航功能

**文件:**
- 修改: `client/src/components/layout/UserSection.tsx`

**Step 1: 添加必要的导入**

在文件顶部添加:

```typescript
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
```

**Step 2: 在组件中添加 navigate hook**

在 `useAuthStore` 后添加:

```typescript
const navigate = useNavigate();
```

**Step 3: 修改最外层 div,添加点击事件和样式**

将 `<div className="p-4 border-b border-slate-200">` 修改为:

```typescript
<div
  className="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
  onClick={() => navigate('/profile')}
>
```

**Step 4: 在用户信息后添加箭头图标**

在 `{!isCollapsed && (` 块的末尾,`</div>` 之前添加:

```typescript
<ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
```

确保箭头图标在 flex 容器中正确对齐。

**Step 5: 提交更改**

```bash
git add client/src/components/layout/UserSection.tsx
git commit -m "feat(ui): UserSection 添加点击导航到个人中心功能"
```

---

## Phase 4: 应用设置 Tab 实现

### Task 8: 创建 AppSettings 组件目录和主组件

**文件:**
- 创建: `client/src/components/profile/AppSettings.tsx`

**Step 1: 创建 profile 目录**

```bash
mkdir -p client/src/components/profile
```

**Step 2: 创建 AppSettings.tsx 文件**

```typescript
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
          <p className="text-slate-500">路径配置 - 待实现</p>
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
          <p className="text-slate-500">存储占用显示 - 待实现</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: 在 Profile.tsx 中使用 AppSettings 组件**

导入组件:

```typescript
import AppSettings from '@/components/profile/AppSettings';
```

替换 settings TabsContent:

```typescript
<TabsContent value="settings">
  <AppSettings />
</TabsContent>
```

**Step 4: 提交更改**

```bash
git add client/src/components/profile/AppSettings.tsx client/src/pages/Profile.tsx
git commit -m "feat(ui): 创建 AppSettings 组件框架"
```

---

### Task 9: 实现路径配置组件

**文件:**
- 创建: `client/src/components/profile/StoragePathConfig.tsx`
- 修改: `client/src/components/profile/AppSettings.tsx`

**Step 1: 创建 StoragePathConfig.tsx 文件**

```typescript
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
```

**Step 2: 在 AppSettings.tsx 中使用 StoragePathConfig**

导入组件:

```typescript
import StoragePathConfig from './StoragePathConfig';
```

替换第一个 Card 的 CardContent:

```typescript
<CardContent>
  <StoragePathConfig />
</CardContent>
```

**Step 3: 提交更改**

```bash
git add client/src/components/profile/StoragePathConfig.tsx client/src/components/profile/AppSettings.tsx
git commit -m "feat(ui): 实现存储路径配置组件"
```

---

### Task 10: 实现存储使用情况显示组件

**文件:**
- 创建: `client/src/components/profile/StorageUsageDisplay.tsx`
- 修改: `client/src/components/profile/AppSettings.tsx`

**Step 1: 创建 StorageUsageDisplay.tsx 文件**

```typescript
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
```

**Step 2: 在 AppSettings.tsx 中使用 StorageUsageDisplay**

导入组件:

```typescript
import StorageUsageDisplay from './StorageUsageDisplay';
```

替换第二个 Card 的 CardContent:

```typescript
<CardContent>
  <StorageUsageDisplay />
</CardContent>
```

**Step 3: 提交更改**

```bash
git add client/src/components/profile/StorageUsageDisplay.tsx client/src/components/profile/AppSettings.tsx
git commit -m "feat(ui): 实现存储使用情况显示组件"
```

---

### Task 11: 实现清理缓存功能

**文件:**
- 修改: `client/src/components/profile/AppSettings.tsx`

**Step 1: 在 AppSettings.tsx 中添加清理缓存 Card**

在第二个 Card 后添加:

```typescript
<Card>
  <CardHeader>
    <CardTitle>清理缓存</CardTitle>
    <CardDescription>
      删除所有已保存的静态资源文件
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ClearCacheSection />
  </CardContent>
</Card>
```

**Step 2: 创建 ClearCacheSection 组件(内联)**

在 AppSettings.tsx 文件中,在 export default 之前添加:

```typescript
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
```

**Step 3: 添加必要的导入**

在文件顶部添加:

```typescript
import { useState } from 'react';
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
```

**Step 4: 提交更改**

```bash
git add client/src/components/profile/AppSettings.tsx
git commit -m "feat(ui): 实现清理缓存功能和确认对话框"
```

---

## Phase 5: 个人信息和订阅管理 Tab

### Task 12: 实现个人信息 Tab

**文件:**
- 创建: `client/src/components/profile/PersonalInfo.tsx`
- 修改: `client/src/pages/Profile.tsx`

**Step 1: 创建 PersonalInfo.tsx 文件**

```typescript
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
```

**Step 2: 在 Profile.tsx 中使用 PersonalInfo**

导入组件:

```typescript
import PersonalInfo from '@/components/profile/PersonalInfo';
```

替换 personal TabsContent:

```typescript
<TabsContent value="personal">
  <PersonalInfo />
</TabsContent>
```

**Step 3: 提交更改**

```bash
git add client/src/components/profile/PersonalInfo.tsx client/src/pages/Profile.tsx
git commit -m "feat(ui): 实现个人信息 Tab"
```

---

### Task 13: 实现订阅管理 Tab

**文件:**
- 创建: `client/src/components/profile/SubscriptionManagement.tsx`
- 修改: `client/src/pages/Profile.tsx`

**Step 1: 创建 SubscriptionManagement.tsx 文件**

```typescript
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
```

**Step 2: 在 Profile.tsx 中使用 SubscriptionManagement**

导入组件:

```typescript
import SubscriptionManagement from '@/components/profile/SubscriptionManagement';
```

替换 subscription TabsContent:

```typescript
<TabsContent value="subscription">
  <SubscriptionManagement />
</TabsContent>
```

**Step 3: 提交更改**

```bash
git add client/src/components/profile/SubscriptionManagement.tsx client/src/pages/Profile.tsx
git commit -m "feat(ui): 实现订阅管理 Tab"
```

---

## Phase 6: 测试和优化

### Task 14: 端到端测试

**Step 1: 测试 Electron 后端功能**

手动测试以下功能:
1. 打开应用,检查数据库表是否创建成功
2. 测试文件夹选择对话框
3. 测试存储大小计算(创建一些测试文件)
4. 测试清理缓存功能

**Step 2: 测试前端功能**

手动测试以下功能:
1. 点击 UserSection 导航到个人中心
2. 切换三个 Tab,确认内容正确显示
3. 测试路径配置的保存和加载
4. 测试存储使用情况的显示和刷新
5. 测试清理缓存的确认对话框和执行

**Step 3: 跨平台测试(如果可能)**

在 Windows 和 macOS 上测试:
1. 路径显示是否正确
2. 文件夹选择对话框是否正常
3. 文件操作是否正常

**Step 4: 记录测试结果**

创建测试报告文档(可选):

```bash
echo "# 个人中心功能测试报告

## 测试日期
$(date)

## 测试结果
- [ ] Electron 后端功能
- [ ] 前端 UI 功能
- [ ] 路径配置
- [ ] 存储管理
- [ ] 清理缓存

## 发现的问题
(记录测试中发现的问题)

## 修复建议
(记录需要修复的内容)
" > docs/test-reports/profile-settings-test.md
```

---

### Task 15: 错误处理优化

**文件:**
- 修改: `client/src/store/settings.ts`

**Step 1: 添加路径验证**

在 `updateStoragePath` 方法开始处添加验证:

```typescript
// 验证自定义路径
if (pathType === 'custom' && !customPath) {
  throw new Error('自定义路径不能为空');
}
```

**Step 2: 添加更详细的错误日志**

在各个 catch 块中添加更详细的错误信息:

```typescript
catch (error) {
  console.error('Update storage path error:', error);
  // 添加更多上下文信息
  console.error('Path type:', pathType);
  console.error('Custom path:', customPath);
  throw error;
}
```

**Step 3: 提交更改**

```bash
git add client/src/store/settings.ts
git commit -m "feat(store): 添加路径验证和详细错误日志"
```

---

### Task 16: 性能优化

**文件:**
- 修改: `client/electron/main.ts`

**Step 1: 为大文件夹计算添加超时保护**

修改 `storage:calculateSize` handler,添加超时机制:

```typescript
ipcMain.handle('storage:calculateSize', async (_, folderPath: string) => {
  const timeout = 30000; // 30 秒超时
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('计算超时')), timeout);
  });

  const calculatePromise = (async () => {
    // 原有的计算逻辑
    // ...
  })();

  try {
    return await Promise.race([calculatePromise, timeoutPromise]);
  } catch (error) {
    if (error.message === '计算超时') {
      console.warn('Storage calculation timeout');
      return { bytes: 0, count: 0, timeout: true };
    }
    throw error;
  }
});
```

**Step 2: 提交更改**

```bash
git add client/electron/main.ts
git commit -m "perf(electron): 为存储计算添加超时保护"
```

---

## 完成检查清单

在完成所有任务后,确认以下项目:

- [ ] 所有代码已提交到 git
- [ ] Electron 后端功能正常工作
- [ ] 前端 UI 显示正确
- [ ] 路径配置可以保存和加载
- [ ] 存储使用情况计算准确
- [ ] 清理缓存功能正常
- [ ] 错误处理完善
- [ ] 用户体验流畅
- [ ] 跨平台兼容性测试通过(如果可能)

---

## 后续优化建议

1. **添加单元测试**
   - 为 Zustand store 添加测试
   - 为组件添加测试

2. **添加数据迁移功能**
   - 路径切换时提示用户迁移文件
   - 实现文件复制/移动功能

3. **添加存储配额管理**
   - 设置存储空间上限
   - 自动清理旧文件

4. **优化大文件夹计算**
   - 使用 Worker 避免阻塞
   - 显示计算进度

5. **添加激活历史功能**
   - 从 Electron 数据库读取激活记录
   - 在订阅管理 Tab 中显示

---

## 总结

本实施计划涵盖了个人中心与应用设置功能的完整实现,包括:

- ✅ Electron 后端基础设施(数据库、IPC handlers)
- ✅ 前端状态管理(Zustand store)
- ✅ UI 组件(Profile 页面、三个 Tab)
- ✅ 路径配置功能
- ✅ 存储管理功能
- ✅ 清理缓存功能
- ✅ 错误处理和优化

按照任务顺序逐步实施,每个任务完成后及时提交,确保代码质量和可追溯性。
