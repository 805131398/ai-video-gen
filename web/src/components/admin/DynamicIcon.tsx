"use client";

import { Icon } from "@iconify/react";
import * as LucideIcons from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface DynamicIconProps {
  icon: string;
  className?: string;
}

export function DynamicIcon({ icon, className }: DynamicIconProps) {
  const IconComponent = useMemo(() => {
    if (!icon) return null;

    // 1. 尝试匹配本地 Lucide 图标 (PascalCase, e.g., "Home")
    if (!icon.includes(":") && /^[A-Z]/.test(icon)) {
      const LocalIcon = (LucideIcons as any)[icon];
      if (LocalIcon) {
        return LocalIcon;
      }
    }

    // 2. 如果不是本地格式，或者本地找不到，均视为 Iconify 图标
    // Iconify 处理 "lucide:home", "mdi:account" 等格式
    // 如果传入的是 kebab-case 但没前缀 (e.g. "home")，Iconify 可能无法识别，
    // 但我们的 IconSelector 会确保生成带前缀的名称。
    return null;
  }, [icon]);

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // 使用 Iconify 网络加载
  return <Icon icon={icon} className={className} />;
}
