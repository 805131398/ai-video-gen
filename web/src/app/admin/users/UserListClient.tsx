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
  AssignRolesDialog,
} from "@/components/admin";
import { MoreHorizontal, ToggleLeft, ToggleRight, Shield } from "lucide-react";
import { toggleUserStatus, assignRolesToUser, getAllRoles } from "./actions";
import { format } from "date-fns";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  roles: {
    role: {
      id: string;
      name: string;
      code: string;
    };
  }[];
}

interface UserListData {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UserListClientProps {
  initialData: UserListData;
  initialFilters: {
    search?: string;
    isActive?: string;
  };
  availableRoles: { id: string; name: string; code: string; description: string | null }[];
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
    placeholder: "搜索用户名、邮箱、手机号",
  },
];

export function UserListClient({
  initialData,
  initialFilters,
  availableRoles,
}: UserListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    isActive: boolean;
  }>({
    open: false,
    userId: "",
    userName: "",
    isActive: false,
  });

  const [assignRolesDialog, setAssignRolesDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    userRoles: { id: string; name: string }[];
  }>({
    open: false,
    userId: "",
    userName: "",
    userRoles: [],
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
        router.push(`/admin/users?${params.toString()}`);
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
    if (!confirmDialog.userId) return;

    try {
      await toggleUserStatus(confirmDialog.userId);
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    } catch (error) {
      console.error("Failed to toggle user status:", error);
    }
  };

  const openConfirmDialog = (user: User) => {
    setConfirmDialog({
      open: true,
      userId: user.id,
      userName: user.name || user.phone || user.email || "未知用户",
      isActive: user.isActive,
    });
  };

  const openAssignRolesDialog = (user: User) => {
    setAssignRolesDialog({
      open: true,
      userId: user.id,
      userName: user.name || user.phone || user.email || "未知用户",
      userRoles: user.roles.map((r) => r.role),
    });
  };

  const handleAssignRoles = async (userId: string, roleIds: string[]) => {
    await assignRolesToUser(userId, roleIds);
    router.refresh();
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
                <TableHead>用户名</TableHead>
                <TableHead>手机号</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>系统角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isPending ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              ) : (
                initialData.users.map((user) => {
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || "-"}
                      </TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        {user.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r) => (
                              <StatusBadge key={r.role.id} variant="info">
                                {r.role.name}
                              </StatusBadge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">未分配</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={user.isActive ? "success" : "default"}
                        >
                          {user.isActive ? "启用" : "禁用"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openAssignRolesDialog(user)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              分配角色
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openConfirmDialog(user)}
                            >
                              {user.isActive ? (
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
                  );
                })
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
        title={confirmDialog.isActive ? "禁用用户" : "启用用户"}
        description={
          confirmDialog.isActive
            ? `确定要禁用用户「${confirmDialog.userName}」吗？禁用后该用户将无法登录系统。`
            : `确定要启用用户「${confirmDialog.userName}」吗？`
        }
        confirmText={confirmDialog.isActive ? "禁用" : "启用"}
        onConfirm={handleToggleStatus}
        variant={confirmDialog.isActive ? "destructive" : "default"}
      />

      <AssignRolesDialog
        open={assignRolesDialog.open}
        onOpenChange={(open) =>
          setAssignRolesDialog((prev) => ({ ...prev, open }))
        }
        userId={assignRolesDialog.userId}
        userName={assignRolesDialog.userName}
        userRoles={assignRolesDialog.userRoles}
        availableRoles={availableRoles}
        onAssign={handleAssignRoles}
      />
    </div>
  );
}
