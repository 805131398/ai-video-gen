// Admin System Type Definitions

export type MenuType = "DIRECTORY" | "MENU";

export interface MenuItem {
  id: string;
  label: string;
  type?: MenuType; // 菜单类型：DIRECTORY=目录，MENU=菜单
  icon?: string; // 图标名称（字符串）
  href?: string;
  children?: MenuItem[];
  parentId?: string; // 父菜单ID
  parent?: string; // 兼容旧字段
  order?: number;
  visible?: boolean;
  permissions?: string[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatar: string | null;
  avatarType?: string | null;
  avatarStyle?: string | null;
  avatarSeed?: string | null;
  provider: string | null;
  createdAt: Date | string; // API返回字符串，数据库是Date
  updatedAt: Date | string; // API返回字符串，数据库是Date
  roles?: Role[];
  isActive?: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: RolePermission[];
  _count?: {
    users: number;
    permissions: number;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission?: Permission;
  createdAt?: Date | string;
}

export interface SystemConfig {
  id: string;
  category: 'oss' | 'sms' | 'email' | 'system' | 'other';
  key: string;
  value: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'password';
  isSecret?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileRecord {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  url: string;
  provider: 'ali-oss' | 's3' | 'local';
  uploadedBy: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalFiles: number;
  storageUsed: number;
  todayLogins: number;
}

export type ConfigFormData = {
  category: SystemConfig['category'];
  configs: {
    key: string;
    value: string;
    label: string;
    description?: string;
    type: SystemConfig['type'];
    isSecret?: boolean;
  }[];
};
