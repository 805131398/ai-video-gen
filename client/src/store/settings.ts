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

  updateStoragePath: async (pathType, customPath = '') => {
    // 验证自定义路径
    if (pathType === 'custom' && !customPath) {
      throw new Error('自定义路径不能为空');
    }

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
      // 添加更多上下文信息
      console.error('Path type:', pathType);
      console.error('Custom path:', customPath);
      throw error;
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
