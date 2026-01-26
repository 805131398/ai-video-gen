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
import { MoreHorizontal, Edit, ToggleLeft, ToggleRight, Settings } from "lucide-react";
import { toggleConfigStatus } from "./actions";
import { format } from "date-fns";

interface ConfigData {
  id: string;
  env: string;
  groupCode: string;
  configKey: string;
  configValue: string;
  valueType: string;
  isEncrypted: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
  };
}

interface ConfigListData {
  configs: ConfigData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ConfigListClientProps {
  initialData: ConfigListData;
  initialFilters: {
    search?: string;
    groupCode?: string;
    env?: string;
    isActive?: string;
  };
  configGroups: string[];
}

const envMap: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "danger" }> = {
  DEV: { label: "开发", variant: "default" },
  TEST: { label: "测试", variant: "info" },
  PROD: { label: "生产", variant: "success" },
};

const valueTypeMap: Record<string, string> = {
  STRING: "字符串",
  NUMBER: "数字",
  BOOLEAN: "布尔",
  JSON: "JSON",
};

export function ConfigListClient({
  initialData,
  initialFilters,
  configGroups,
}: ConfigListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    configId: string;
    configKey: string;
    isActive: boolean;
  }>({
    open: false,
    configId: "",
    configKey: "",
    isActive: false,
  });

  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    groupCode: initialFilters.groupCode || "all",
    env: initialFilters.env || "all",
    isActive: initialFilters.isActive || "all",
    search: initialFilters.search || "",
  });

  const filterConfigs: FilterConfig[] = [
    {
      key: "groupCode",
      label: "配置组",
      type: "select",
      options: configGroups.map((g) => ({ value: g, label: g })),
    },
    {
      key: "env",
      label: "环境",
      type: "select",
      options: [
        { value: "DEV", label: "开发" },
        { value: "TEST", label: "测试" },
        { value: "PROD", label: "生产" },
      ],
    },
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
      placeholder: "搜索配置键、描述",
    },
  ];

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
        router.push(`/admin/configs?${params.toString()}`);
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
    if (!confirmDialog.configId) return;

    try {
      await toggleConfigStatus(confirmDialog.configId, "current-user-id");
      setConfirmDialog((prev) => ({ ...prev, open: false }));
    } catch (error) {
      console.error("Failed to toggle config status:", error);
    }
  };

  const openConfirmDialog = (config: ConfigData) => {
    setConfirmDialog({
      open: true,
      configId: config.id,
      configKey: config.configKey,
      isActive: config.isActive,
    });
  };

  const maskValue = (value: string, isEncrypted: boolean) => {
    if (isEncrypted) {
      return "******";
    }
    if (value.length > 50) {
      return value.substring(0, 50) + "...";
    }
    return value;
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
                <TableHead>配置键</TableHead>
                <TableHead>配置组</TableHead>
                <TableHead>环境</TableHead>
                <TableHead>值类型</TableHead>
                <TableHead>配置值</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[80px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isPending ? "加载中..." : "暂无数据"}
                  </TableCell>
                </TableRow>
              ) : (
                initialData.configs.map((config) => {
                  const envInfo = envMap[config.env] || { label: config.env, variant: "default" as const };

                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{config.configKey}</span>
                          {config.isEncrypted && (
                            <StatusBadge variant="warning">加密</StatusBadge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {config.groupCode}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={envInfo.variant}>
                          {envInfo.label}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {valueTypeMap[config.valueType] || config.valueType}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-sm">
                        {maskValue(config.configValue, config.isEncrypted)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {config.description || "-"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={config.isActive ? "success" : "default"}
                        >
                          {config.isActive ? "启用" : "禁用"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(config.createdAt), "yyyy-MM-dd HH:mm")}
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
                              onClick={() => openConfirmDialog(config)}
                            >
                              {config.isActive ? (
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
        title={confirmDialog.isActive ? "禁用配置" : "启用配置"}
        description={
          confirmDialog.isActive
            ? `确定要禁用配置「${confirmDialog.configKey}」吗？`
            : `确定要启用配置「${confirmDialog.configKey}」吗？`
        }
        confirmText={confirmDialog.isActive ? "禁用" : "启用"}
        onConfirm={handleToggleStatus}
        variant={confirmDialog.isActive ? "destructive" : "default"}
      />
    </div>
  );
}
