"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
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
import { MoreHorizontal, Edit, ToggleLeft, ToggleRight, Shield } from "lucide-react";
import { toggleRoleStatus } from "./actions";
import { format } from "date-fns";

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  _count: {
    menus: number;
    permissions: number;
  };
  createdBy: {
    id: string;
    name: string | null;
  };
}

interface RoleListData {
  roles: Role[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RoleListClientProps {
  initialData: RoleListData;
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
    placeholder: "搜索角色名称、编码",
  },
];

export function RoleListClient({
  initialData,
  initialFilters,
}: RoleListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    roleId: string;
    roleName: string;
    isActive: boolean;
  }>({
    open: false,
    roleId: "",
    roleName: "",
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
        router.push(`/admin/roles?${params.toString()}`);
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
    if (!confirmDialog.roleId) return;

    try {
      await toggleRoleStatus(confirmDialog.roleId, "current-user-id");
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    } catch (error) {
      console.error("Failed to toggle role status:", error);
    }
  };

  const openConfirmDialog = (role: Role) => {
    setConfirmDialog({
      open: true,
      roleId: role.id,
      roleName: role.name,
      isActive: role.isActive,
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
                <TableHead>角色名称</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>菜单数</TableHead>
                <TableHead>权限数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.roles.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isPending ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              ) : (
                initialData.roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{role.name}</span>
                        {role.isSystem && (
                          <StatusBadge variant="info">系统</StatusBadge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {role.code}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {role.description || "-"}
                    </TableCell>
                    <TableCell>{role._count.menus}</TableCell>
                    <TableCell>{role._count.permissions}</TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={role.isActive ? "success" : "default"}
                      >
                        {role.isActive ? "启用" : "禁用"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(role.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/roles/${role.id}`}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </Link>
                          </DropdownMenuItem>
                          {!role.isSystem && (
                            <DropdownMenuItem
                              onClick={() => openConfirmDialog(role)}
                            >
                              {role.isActive ? (
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
                          )}
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
        title={confirmDialog.isActive ? "禁用角色" : "启用角色"}
        description={
          confirmDialog.isActive
            ? `确定要禁用角色「${confirmDialog.roleName}」吗？`
            : `确定要启用角色「${confirmDialog.roleName}」吗？`
        }
        confirmText={confirmDialog.isActive ? "禁用" : "启用"}
        onConfirm={handleToggleStatus}
        variant={confirmDialog.isActive ? "destructive" : "default"}
      />
    </div>
  );
}
