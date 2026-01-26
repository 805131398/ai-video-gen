"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/common/UserAvatar";
import { LogOut, Settings, User, ChevronRight } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 路径到中文名称的映射
const pathNameMap: Record<string, string> = {
  admin: "控制台",
  stores: "门店管理",
  hierarchy: "层级关系",
  products: "商品管理",
  categories: "商品分类",
  orders: "订单管理",
  upgrades: "升级申请",
  rewards: "奖励管理",
  rules: "奖励规则",
  users: "用户管理",
  roles: "角色管理",
  menus: "菜单管理",
  configs: "系统配置",
};

export function AdminHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // 生成面包屑
  const getBreadcrumbs = () => {
    if (!pathname) return [];
    const segments = pathname.split("/").filter(Boolean);
    // 过滤掉动态路由参数（如 [id]）
    return segments
      .filter((seg) => !seg.startsWith("[") && !/^[a-f0-9-]{36}$/i.test(seg))
      .map((seg) => pathNameMap[seg] || seg);
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <nav className="flex items-center text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />
            )}
            <span
              className={
                index === breadcrumbs.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <UserAvatar
                user={{
                  image: session?.user?.image,
                  name: session?.user?.name,
                  email: session?.user?.email,
                  id: session?.user?.id,
                }}
                className="h-8 w-8"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name || "管理员"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/user/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>个人资料</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span>设置</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={async () => {
                await signOut({ callbackUrl: "/login", redirect: true });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
