"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  SearchFilters,
  FilterConfig,
  Pagination,
  StatusBadge,
  ConfirmDialog,
} from "@/components/admin";
import { MoreHorizontal, Edit, ToggleLeft, ToggleRight, Menu } from "lucide-react";
import { toggleMenuStatus } from "./actions";
import { format } from "date-fns";

interface MenuData {
  id: string;
  name: string;
  label: string;
  href: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  parent: {
    id: string;
    name: string;
    label: string;
  } | null;
  _count: {
    children: number;
    roles: number;
  };
  createdBy: {
    id: string;
    name: string | null;
  };
}

interface MenuListData {
  menus: MenuData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface MenuListClientProps {
  initialData: MenuListData;
  initialFilters: {
    search?: string;
    isActive?: string;
  };
}

const filterConfigs: FilterConfig[] = [
  {
    key: "isActive",
    label: "状态",
    type: "select",
    options: [
      { value: "true", label: "启用" },
      { value: "false", label: "禁用" },
    ],
  },
  {
    key: "search",
    label: "搜索",
    type: "search",
    placeholder: "搜索菜单名称、标签",
  },
];

export function MenuListClient({
  initialData,
  initialFilters,
}: MenuListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    menuId: string;
    menuName: string;
    isActive: boolean;
  }>({
    open: false,
    menuId: "",
    menuName: "",
    isActive: false,
  });

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    isActive: initialFilters.isActive || "all",
    search: initialFilters.search || "",
  });

  const updateUrl = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      startTransition(() => {
        router.push(`/admin/menus?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));

    if (key === "search") {
      const timeoutId = setTimeout(() => {
        updateUrl({ [key]: value });
      }, 300);
      return () => clearTimeout(timeoutId);
    }

    updateUrl({ [key]: value });
  };

  const handlePageChange = (page: number) => {
    updateUrl({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateUrl({ pageSize, page: 1 });
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.menuId) return;

    try {
      await toggleMenuStatus(confirmDialog.menuId, "current-user-id");
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    } catch (error) {
      console.error("Failed to toggle menu status:", error);
    }
  };

  const openConfirmDialog = (menu: MenuData) => {
    setConfirmDialog({
      open: true,
      menuId: menu.id,
      menuName: menu.label,
      isActive: menu.isActive,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <SearchFilters
            filters={filterConfigs}
            values={filterValues}
            onChange={handleFilterChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>菜单名称</TableHead>
                <TableHead>标识</TableHead>
                <TableHead>路径</TableHead>
                <TableHead>父级菜单</TableHead>
                <TableHead>排序</TableHead>
                <TableHead>子菜单数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.menus.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isPending ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              ) : (
                initialData.menus.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Menu className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{menu.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {menu.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {menu.href || "-"}
                    </TableCell>
                    <TableCell>
                      {menu.parent ? menu.parent.label : "-"}
                    </TableCell>
                    <TableCell>{menu.sortOrder}</TableCell>
                    <TableCell>{menu._count.children}</TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={menu.isActive ? "success" : "default"}
                      >
                        {menu.isActive ? "启用" : "禁用"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(menu.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openConfirmDialog(menu)}
                          >
                            {menu.isActive ? (
                              <>
                                <ToggleLeft className="mr-2 h-4 w-4" />
                                禁用
                              </>
                            ) : (
                              <>
                                <ToggleRight className="mr-2 h-4 w-4" />
                                启用
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            currentPage={initialData.page}
            totalPages={initialData.totalPages}
            pageSize={initialData.pageSize}
            totalItems={initialData.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
        title={confirmDialog.isActive ? "禁用菜单" : "启用菜单"}
        description={
          confirmDialog.isActive
            ? `确定要禁用菜单「${confirmDialog.menuName}」吗？`
            : `确定要启用菜单「${confirmDialog.menuName}」吗？`
        }
        confirmText={confirmDialog.isActive ? "禁用" : "启用"}
        onConfirm={handleToggleStatus}
        variant={confirmDialog.isActive ? "destructive" : "default"}
      />
    </div>
  );
}
