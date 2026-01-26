// 权限代码常量
export const PERMISSIONS = {
  // 角色管理
  ROLE_VIEW: "role:view",
  ROLE_CREATE: "role:create",
  ROLE_EDIT: "role:edit",
  ROLE_DELETE: "role:delete",
  ROLE_ASSIGN: "role:assign", // 分配权限

  // 用户管理
  USER_VIEW: "user:view",
  USER_CREATE: "user:create",
  USER_EDIT: "user:edit",
  USER_DELETE: "user:delete",
  USER_ROLE_ASSIGN: "user:role:assign", // 分配角色

  // 菜单管理
  MENU_VIEW: "menu:view",
  MENU_CREATE: "menu:create",
  MENU_EDIT: "menu:edit",
  MENU_DELETE: "menu:delete",

  // 系统管理
  SYSTEM_CONFIG: "system:config",

  // 操作日志
  LOG_VIEW: "log:view",

  // 文件管理
  FILE_VIEW: "file:view",
  FILE_UPLOAD: "file:upload",
  FILE_DELETE: "file:delete",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
