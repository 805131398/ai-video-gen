import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function StatusBadge({
  variant = "default",
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// 通用状态映射
export const activeStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  true: { label: "启用", variant: "success" },
  false: { label: "禁用", variant: "default" },
};

// 任务执行状态映射
export const taskStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  RUNNING: { label: "运行中", variant: "info" },
  SUCCESS: { label: "成功", variant: "success" },
  FAILED: { label: "失败", variant: "danger" },
};

// 租户状态映射
export const tenantStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "活跃", variant: "success" },
  SUSPENDED: { label: "暂停", variant: "warning" },
  EXPIRED: { label: "过期", variant: "danger" },
};
