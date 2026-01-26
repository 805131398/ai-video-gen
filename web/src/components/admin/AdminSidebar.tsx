"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MenuItem } from "@/types/admin";
import {
  ChevronDown,
  ChevronRight,
  Home,
  Loader2,
  Menu as MenuIcon,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DynamicIcon } from "./DynamicIcon";

interface MenuItemProps {
  item: MenuItem;
  depth?: number;
  siblings?: MenuItem[];
}

function MenuItemComponent({ item, depth = 0, siblings = [] }: MenuItemProps) {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  
  // 检查当前路径是否在此菜单项或其子菜单中
  const isChildActive = useMemo(() => {
    if (!pathname) return false;
    
    // 检查自己的 href
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return true;
    }
    
    // 递归检查子菜单
    const checkChildren = (children: MenuItem[] | undefined): boolean => {
      if (!children) return false;
      return children.some((child) => {
        if (child.href && (pathname === child.href || pathname.startsWith(`${child.href}/`))) {
          return true;
        }
        return checkChildren(child.children);
      });
    };
    
    return checkChildren(item.children);
  }, [pathname, item.href, item.children]);
  
  // 只有当子菜单中有活跃项时才默认展开
  const [isOpen, setIsOpen] = useState(isChildActive);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Improve active state detection
  const isActive = useMemo(() => {
    if (!item.href || !pathname) return false;

    // Exact match
    if (pathname === item.href) return true;

    // Sub-route match (but avoid matching /admin against /admin-user)
    if (item.href !== "/admin" && item.href !== "/") {
      // Check if pathname starts with this item's href
      if (pathname.startsWith(`${item.href}/`)) {
        // Check if there's a sibling menu item that matches more precisely
        // For example: /admin/stores should not be active when /admin/stores/hierarchy is the current path
        // and /admin/stores/hierarchy is also a sibling menu item
        const hasSiblingMatch = siblings.some(
          (sibling) =>
            sibling.id !== item.id &&
            sibling.href &&
            (pathname === sibling.href || pathname.startsWith(`${sibling.href}/`))
        );
        if (hasSiblingMatch) return false;

        // Also check children
        const hasChildMatch = item.children?.some(
          (child) => child.href && (pathname === child.href || pathname.startsWith(`${child.href}/`))
        );
        return !hasChildMatch;
      }
    }

    return false;
  }, [pathname, item.href, item.id, item.children, siblings]);

  // Reset navigating state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const content = (
    <div className="flex items-center gap-2.5 w-full">
      {isNavigating ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
      ) : (
        item.icon ? (
          <DynamicIcon icon={item.icon} className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
        ) : (
          <MenuIcon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
        )
      )}
      <span className={cn("flex-1 text-[13px]", isActive && "font-medium")}>{item.label}</span>
      {hasChildren && (
        isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70" />
        )
      )}
    </div>
  );

  return (
    <div>
      {item.href && !hasChildren ? (
        <Link
          href={item.href}
          onClick={() => {
            if (pathname !== item.href) {
              setIsNavigating(true);
            }
          }}
          className={cn(
            "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            (isActive || isNavigating)
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground",
            depth > 0 && "ml-5"
          )}
        >
          {content}
        </Link>
      ) : (
        <div
          onClick={() => hasChildren && setIsOpen(!isOpen)}
          className={cn(
            "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground cursor-pointer",
            "text-muted-foreground",
            depth > 0 && "ml-5"
          )}
        >
          {content}
        </div>
      )}

      {hasChildren && isOpen && (
        <div className="mt-0.5">
          {item.children!.map((child) => (
            <MenuItemComponent
              key={child.id}
              item={child}
              depth={depth + 1}
              siblings={item.children}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AdminSidebarProps {
  menuItems: MenuItem[];
}

export function AdminSidebar({ menuItems }: AdminSidebarProps) {
  return (
    <div className="flex h-full w-60 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-medium text-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="h-4 w-4" />
          </div>
          <span>后台管理系统</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-0.5">
          {menuItems.map((item) => (
            <MenuItemComponent key={item.id} item={item} siblings={menuItems} />
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}
