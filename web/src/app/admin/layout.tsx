import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { MenuItem } from "@/types/admin";

// 临时静态菜单配置，后续从数据库动态加载
const staticMenuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "仪表盘",
    icon: "LayoutDashboard",
    href: "/admin",
  },
  {
    id: "ai-video",
    label: "AI 视频",
    icon: "Video",
    children: [
      {
        id: "ai-config",
        label: "模型配置",
        icon: "Cpu",
        href: "/admin/ai-config",
      },
      {
        id: "templates",
        label: "提示词模板",
        icon: "FileText",
        href: "/admin/templates",
      },
      {
        id: "ai-stats",
        label: "使用统计",
        icon: "BarChart3",
        href: "/admin/ai-stats",
      },
      {
        id: "ai-logs",
        label: "调用日志",
        icon: "ScrollText",
        href: "/admin/ai-logs",
      },
      {
        id: "ai-projects",
        label: "作品管理",
        icon: "FolderVideo",
        href: "/admin/ai-projects",
      },
    ],
  },
  {
    id: "system",
    label: "系统管理",
    icon: "Settings",
    children: [
      {
        id: "user-list",
        label: "用户管理",
        icon: "Users",
        href: "/admin/users",
      },
      {
        id: "role-list",
        label: "角色管理",
        icon: "Shield",
        href: "/admin/roles",
      },
      {
        id: "menu-list",
        label: "菜单管理",
        icon: "Menu",
        href: "/admin/menus",
      },
      {
        id: "config-list",
        label: "系统配置",
        icon: "Cog",
        href: "/admin/configs",
      },
      {
        id: "card-keys",
        label: "卡密管理",
        icon: "Key",
        href: "/admin/card-keys",
      },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/40">
      <AdminSidebar menuItems={staticMenuItems} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
