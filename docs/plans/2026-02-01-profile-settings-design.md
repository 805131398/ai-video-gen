# 个人中心与应用设置功能设计

**日期**: 2026-02-01
**状态**: 设计完成
**类型**: 新功能

## 概述

在客户端应用中添加个人中心页面,提供用户信息查看、订阅管理和应用设置功能。重点实现静态资源(图片、视频)保存位置的配置和存储管理功能。

## 需求

### 功能需求

1. **个人中心入口**
   - 点击侧边栏用户区域打开个人中心页面
   - 添加视觉提示(箭头图标、hover 效果)

2. **Tab 页面结构**
   - 个人信息 Tab:显示用户名、邮箱等基本信息
   - 订阅管理 Tab:显示订阅状态、激活码输入、订阅历史
   - 应用设置 Tab:静态资源保存位置配置和存储管理

3. **静态资源配置**
   - 混合路径选择:预设路径(应用数据目录、文档目录、下载目录) + 自定义路径
   - 默认路径:应用数据目录 `app.getPath('userData')/media`
   - 显示当前使用的实际路径

4. **存储管理**
   - 显示当前占用空间(格式化为 MB/GB)
   - 显示文件数量
   - 一键清理缓存功能(需确认对话框)

### 非功能需求

- 跨平台兼容(macOS、Windows、Linux)
- 路径验证(存在性、写权限)
- 错误处理和用户友好的提示
- 数据持久化(Electron 本地数据库)

## 技术方案

### 技术栈

- **前端框架**: React + TypeScript
- **路由**: React Router v6
- **UI 组件**: shadcn/ui (Tabs, Button, Dialog, Input, RadioGroup)
- **状态管理**: Zustand
- **Electron IPC**: 主进程与渲染进程通信
- **数据库**: better-sqlite3

### 架构设计

```
┌─────────────────────────────────────────┐
│         React 渲染进程                    │
│  ┌───────────────────────────────────┐  │
│  │  Profile 页面                      │  │
│  │  ├─ PersonalInfo Tab              │  │
│  │  ├─ SubscriptionManagement Tab    │  │
│  │  └─ AppSettings Tab               │  │
│  │      ├─ StoragePathConfig         │  │
│  │      ├─ StorageUsageDisplay       │  │
│  │      └─ ClearCacheDialog          │  │
│  └───────────────────────────────────┘  │
│              ↕ IPC 通信                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│         Electron 主进程                   │
│  ┌───────────────────────────────────┐  │
│  │  IPC Handlers                     │  │
│  │  ├─ dialog:selectFolder           │  │
│  │  ├─ storage:getDefaultPath        │  │
│  │  ├─ storage:calculateSize         │  │
│  │  └─ storage:clearCache            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  SQLite 数据库                     │  │
│  │  └─ app_settings 表               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 组件设计

### 1. 文件结构

```
client/src/
├── pages/
│   └── Profile.tsx                      # 个人中心主页面
├── components/
│   └── profile/
│       ├── PersonalInfo.tsx             # 个人信息 Tab
│       ├── SubscriptionManagement.tsx   # 订阅管理 Tab
│       └── AppSettings.tsx              # 应用设置 Tab
│           ├── StoragePathConfig.tsx    # 路径配置组件
│           ├── StorageUsageDisplay.tsx  # 存储占用显示
│           └── ClearCacheDialog.tsx     # 清理确认对话框
├── store/
│   └── settings.ts                      # 设置状态管理
└── types/
    └── index.ts                         # 类型定义扩展
```

### 2. 路由配置

在 `App.tsx` 中添加:

```tsx
<Route path="profile" element={<Profile />} />
```

### 3. Profile 主页面

```tsx
// Profile.tsx
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
          <PersonalInfo />
        </TabsContent>
        <TabsContent value="subscription">
          <SubscriptionManagement />
        </TabsContent>
        <TabsContent value="settings">
          <AppSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 4. AppSettings 组件

包含三个主要部分:

**路径配置区域:**
- RadioGroup 选择路径类型:
  - 应用数据目录(默认)
  - 文档目录
  - 下载目录
  - 自定义路径
- 自定义路径输入框 + "浏览"按钮
- 显示当前实际路径(只读,灰色文本)

**存储使用情况:**
- Card 组件显示:
  - 已使用空间(格式化显示)
  - 文件数量
  - 最后更新时间
- "刷新"按钮重新计算

**清理操作:**
- "清理缓存"按钮(variant="destructive")
- 点击后弹出 AlertDialog 确认
- 显示将要删除的文件数量和大小
- 确认后执行清理并显示结果

### 5. UserSection 改造

```tsx
// UserSection.tsx
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function UserSection({ isCollapsed }: UserSectionProps) {
  const navigate = useNavigate();
  const { user, subscription } = useAuthStore();

  return (
    <div
      className="p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => navigate('/profile')}
    >
      <div className="flex items-center gap-3">
        {/* 原有用户信息显示 */}
        {!isCollapsed && (
          <>
            {/* 用户名和订阅状态 */}
            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
          </>
        )}
      </div>
    </div>
  );
}
```

## Electron 端实现

### 1. IPC Handlers (main.ts)

```typescript
import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

// 选择文件夹
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择保存位置'
  });
  return result.canceled ? undefined : result.filePaths[0];
});

// 获取默认存储路径
ipcMain.handle('storage:getDefaultPath', () => {
  return path.join(app.getPath('userData'), 'media');
});

// 计算文件夹大小
ipcMain.handle('storage:calculateSize', async (_, folderPath: string) => {
  try {
    let totalBytes = 0;
    let fileCount = 0;

    async function calculateDir(dirPath: string) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await calculateDir(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalBytes += stats.size;
          fileCount++;
        }
      }
    }

    await calculateDir(folderPath);
    return { bytes: totalBytes, count: fileCount };
  } catch (error) {
    console.error('Calculate size error:', error);
    return { bytes: 0, count: 0 };
  }
});

// 清理缓存
ipcMain.handle('storage:clearCache', async (_, folderPath: string) => {
  try {
    let deletedCount = 0;

    async function clearDir(dirPath: string) {
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
    }

    await clearDir(folderPath);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Clear cache error:', error);
    return { success: false, deletedCount: 0 };
  }
});
```

### 2. Preload 脚本扩展 (preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // 现有 API...
  storage: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    getDefaultPath: () => ipcRenderer.invoke('storage:getDefaultPath'),
    calculateSize: (path: string) =>
      ipcRenderer.invoke('storage:calculateSize', path),
    clearCache: (path: string) =>
      ipcRenderer.invoke('storage:clearCache', path),
  }
});
```

### 3. 数据库扩展 (database.ts)

```typescript
// 创建设置表
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 获取设置
export function getSetting(key: string) {
  if (!db) return null;
  const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  return row?.value;
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

在 `main.ts` 中添加 IPC handlers:

```typescript
ipcMain.handle('settings:get', (_, key: string) => {
  return getSetting(key);
});

ipcMain.handle('settings:save', (_, key: string, value: string) => {
  return saveSetting(key, value);
});
```

## 状态管理

### settings.ts (Zustand Store)

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

  initializeStorage: async () => {
    set({ isLoading: true });
    try {
      // 从数据库读取配置
      const pathType = await window.electron.settings.get('storage_path_type') || 'default';
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
    } finally {
      set({ isLoading: false });
    }
  },

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
    } finally {
      set({ isLoading: false });
    }
  },

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
}));
```

## 类型定义

在 `client/src/types/index.ts` 中添加:

```typescript
// 存储路径类型
export type StoragePathType = 'default' | 'documents' | 'downloads' | 'custom';

// 存储配置
export interface StorageConfig {
  pathType: StoragePathType;
  customPath?: string;
  currentPath: string;
}

// 存储使用情况
export interface StorageUsage {
  totalBytes: number;
  fileCount: number;
  lastCalculated: Date | null;
}

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
    };
  }
}
```

## 数据流

### 1. 初始化流程

```
用户打开个人中心页面
  ↓
Profile 组件 useEffect
  ↓
调用 initializeStorage()
  ↓
从 Electron 数据库读取配置
  ↓
获取当前实际路径
  ↓
计算存储占用
  ↓
更新 UI 显示
```

### 2. 路径更改流程

```
用户选择新路径
  ↓
验证路径有效性
  ↓
调用 updateStoragePath()
  ↓
保存到 Electron 数据库
  ↓
更新 Zustand store
  ↓
重新计算存储占用
  ↓
显示成功提示
```

### 3. 清理缓存流程

```
用户点击"清理缓存"
  ↓
弹出确认对话框
  ↓
显示文件数量和大小
  ↓
用户确认
  ↓
调用 clearCache()
  ↓
Electron 主进程删除文件
  ↓
返回删除结果
  ↓
刷新存储占用显示
  ↓
显示清理结果 Toast
```

## 错误处理

### 1. 路径选择错误

| 错误类型 | 处理方式 |
|---------|---------|
| 路径不存在 | Toast 提示"路径无效,请重新选择" |
| 无写权限 | Toast 提示"没有写入权限,请选择其他路径" |
| 磁盘空间不足 | Toast 提示"磁盘空间不足" |
| 网络驱动器 | 警告提示"网络驱动器可能影响性能" |

### 2. 清理缓存错误

| 错误类型 | 处理方式 |
|---------|---------|
| 文件被占用 | 跳过该文件,继续删除其他文件 |
| 权限不足 | Toast 提示"权限不足,无法删除部分文件" |
| 部分失败 | 显示成功删除的文件数量 |

### 3. 存储计算错误

| 错误类型 | 处理方式 |
|---------|---------|
| 路径不存在 | 显示 "0 MB" |
| 计算超时 | 显示"计算中..."并重试 |
| 权限不足 | 显示"无法访问" |

## 边界情况处理

1. **路径包含中文或特殊字符**
   - 使用 Node.js `path` 模块正确处理编码
   - 测试各种特殊字符场景

2. **网络驱动器路径**
   - 检测网络路径(Windows: `\\`, macOS: `/Volumes/`)
   - 显示警告提示可能影响性能

3. **清理时有文件正在生成**
   - 使用 try-catch 跳过正在使用的文件
   - 不中断整个清理流程

4. **多个窗口同时修改配置**
   - SQLite 自动处理并发写入
   - 使用事务保证数据一致性

5. **路径切换时的数据迁移**
   - 不自动迁移文件(避免意外数据丢失)
   - 提示用户手动迁移(可选功能)

## 实施计划

### Phase 1: 核心功能 (优先级: 高)

1. **创建 Profile 页面和路由**
   - 创建 `Profile.tsx` 页面
   - 添加路由配置
   - 实现 Tab 切换结构

2. **实现应用设置 Tab**
   - 创建 `AppSettings.tsx` 组件
   - 实现路径配置 UI(RadioGroup + 自定义输入)
   - 显示当前路径

3. **Electron 端实现**
   - 添加 IPC handlers(文件夹选择、默认路径)
   - 扩展 preload 脚本
   - 添加数据库表和方法

4. **状态管理**
   - 创建 `settings.ts` Zustand store
   - 实现路径配置的读取和保存

5. **UserSection 改造**
   - 添加点击事件和导航
   - 添加视觉提示(箭头、hover 效果)

### Phase 2: 存储管理 (优先级: 中)

1. **存储占用计算**
   - 实现 `calculateSize` IPC handler
   - 创建 `StorageUsageDisplay` 组件
   - 显示格式化的大小和文件数量

2. **清理缓存功能**
   - 实现 `clearCache` IPC handler
   - 创建 `ClearCacheDialog` 确认对话框
   - 显示清理结果 Toast

3. **刷新功能**
   - 添加"刷新"按钮
   - 实现手动重新计算

### Phase 3: 完善功能 (优先级: 低)

1. **个人信息 Tab**
   - 创建 `PersonalInfo.tsx` 组件
   - 显示用户基本信息
   - 头像上传(可选)

2. **订阅管理 Tab**
   - 创建 `SubscriptionManagement.tsx` 组件
   - 显示订阅状态
   - 激活码输入(复用现有功能)
   - 订阅历史记录

3. **错误处理和优化**
   - 添加完整的错误处理
   - 路径验证(存在性、权限)
   - 边界情况处理
   - 性能优化(大文件夹计算)

4. **测试**
   - 单元测试(组件、状态管理)
   - 集成测试(IPC 通信)
   - 跨平台测试(macOS、Windows)

## 关键注意事项

1. **跨平台兼容性**
   - 使用 `path.join()` 而不是硬编码路径分隔符
   - 测试 Windows、macOS、Linux 三个平台
   - 注意路径编码问题(中文、特殊字符)

2. **权限检查**
   - 在保存路径前检查写权限
   - 使用 `fs.access()` 验证权限
   - 提供友好的错误提示

3. **原子操作**
   - 清理缓存时使用 try-catch 保护
   - 避免部分删除导致的不一致状态
   - 记录操作日志便于调试

4. **性能优化**
   - 大文件夹计算可能耗时,考虑:
     - 显示进度提示
     - 使用 Worker 避免阻塞(可选)
     - 设置超时限制

5. **用户体验**
   - 所有异步操作显示 loading 状态
   - 操作成功/失败都有明确反馈
   - 危险操作(清理)必须确认
   - 路径显示使用用户友好的格式

## 未来扩展

1. **数据迁移工具**
   - 提供路径切换时的数据迁移功能
   - 显示迁移进度
   - 支持增量迁移

2. **存储配额管理**
   - 设置存储空间上限
   - 达到上限时自动清理旧文件
   - 按项目/日期管理文件

3. **云存储集成**
   - 支持保存到云存储(阿里云 OSS、AWS S3)
   - 自动同步功能
   - 离线缓存管理

4. **文件组织**
   - 按项目自动分类
   - 按日期自动归档
   - 自定义文件命名规则

## 总结

本设计方案提供了一个完整的个人中心和应用设置功能,重点实现了静态资源保存位置的配置和存储管理。设计遵循以下原则:

- ✅ 用户友好:清晰的 UI、明确的反馈、安全的操作
- ✅ 跨平台兼容:支持 macOS、Windows、Linux
- ✅ 可扩展性:模块化设计,便于未来扩展
- ✅ 健壮性:完整的错误处理和边界情况处理
- ✅ 性能优化:异步操作、合理的缓存策略

实施时建议按照 Phase 1 → Phase 2 → Phase 3 的顺序逐步完成,确保核心功能优先落地。
