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
import {
  MoreHorizontal,
  Edit,
  ToggleLeft,
  ToggleRight,
  Star,
  StarOff,
  Trash2,
  Cloud,
} from "lucide-react";
import {
  toggleProviderStatus,
  setDefaultProvider,
  deleteStorageProvider,
} from "./actions";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

interface StorageProviderData {
  id: string;
  providerCode: string;
  providerName: string;
  config: Record<string, unknown>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
  };
}

interface StorageProviderListData {
  providers: StorageProviderData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface StorageProviderListClientProps {
  initialData: StorageProviderListData;
  initialFilters: {
    search?: string;
    providerCode?: string;
    isActive?: string;
  };
  providerCodes: string[];
}

const providerCodeMap: Record<string, { label: string; icon: string }> = {
  "ali-oss": { label: "阿里云 OSS", icon: "☁️" },
  "aws-s3": { label: "AWS S3", icon: "☁️" },
  "tencent-cos": { label: "腾讯云 COS", icon: "☁️" },
  local: { label: "本地存储", icon: "💾" },
};

export function StorageProviderListClient({
  initialData,
  initialFilters,
  providerCodes,
}: StorageProviderListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "toggle" | "delete" | "default";
    providerId: string;
    providerName: string;
    isActive?: boolean;
  }>({
    open: false,
    type: "toggle",
    providerId: "",
    providerName: "",
  });

  const filterConfigs: FilterConfig[] = [
    {
      type: "select",
      name: "providerCode",
      label: "提供商类型",
      placeholder: "全部类型",
      options: [
        { label: "全部类型", value: "all" },
        ...providerCodes.map((code) => ({
          label: providerCodeMap[code]?.label || code,
          value: code,
        })),
      ],
    },
    {
      type: "select",
      name: "isActive",
      label: "状态",
      placeholder: "全部状态",
      options: [
        { label: "全部状态", value: "all" },
        { label: "启用", value: "true" },
        { label: "禁用", value: "false" },
      ],
    },
  ];

  const handleFilterChange = useCallback(
    (filters: Record<string, string>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", page.toString());
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleToggleStatus = useCallback(
    (providerId: string, providerName: string, isActive: boolean) => {
      setConfirmDialog({
        open: true,
        type: "toggle",
        providerId,
        providerName,
        isActive,
      });
    },
    []
  );

  const handleSetDefault = useCallback(
    (providerId: string, providerName: string) => {
      setConfirmDialog({
        open: true,
        type: "default",
        providerId,
        providerName,
      });
    },
    []
  );

  const handleDelete = useCallback(
    (providerId: string, providerName: string) => {
      setConfirmDialog({
        open: true,
        type: "delete",
        providerId,
        providerName,
      });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!session?.user?.id) return;

    startTransition(async () => {
      try {
        if (confirmDialog.type === "toggle") {
          await toggleProviderStatus(confirmDialog.providerId, session.user.id);
        } else if (confirmDialog.type === "default") {
          await setDefaultProvider(confirmDialog.providerId, session.user.id);
        } else if (confirmDialog.type === "delete") {
          await deleteStorageProvider(confirmDialog.providerId);
        }
        router.refresh();
      } catch (error) {
        console.error("操作失败:", error);
        alert(error instanceof Error ? error.message : "操作失败");
      } finally {
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  }, [confirmDialog, router, session]);

  const getConfirmMessage = () => {
    if (confirmDialog.type === "toggle") {
      return `确定要${confirmDialog.isActive ? "禁用" : "启用"}存储配置"${confirmDialog.providerName}"吗？`;
    } else if (confirmDialog.type === "default") {
      return `确定要将"${confirmDialog.providerName}"设置为默认存储吗？`;
    } else {
      return `确定要删除存储配置"${confirmDialog.providerName}"吗？此操作不可恢复。`;
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <SearchFilters
            filters={filterConfigs}
            initialValues={initialFilters}
            onFilterChange={handleFilterChange}
            searchPlaceholder="搜索提供商名称或代码..."
          />

          <div className="mt-6 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>提供商</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>配置信息</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.providers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  initialData.providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.providerName}</span>
                          {provider.isDefault && (
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{providerCodeMap[provider.providerCode]?.icon}</span>
                          <span>{providerCodeMap[provider.providerCode]?.label || provider.providerCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground">
                          {provider.providerCode === "ali-oss" && (
                            <span>Bucket: {(provider.config as { bucket?: string }).bucket}</span>
                          )}
                          {provider.providerCode === "aws-s3" && (
                            <span>Bucket: {(provider.config as { bucket?: string }).bucket}</span>
                          )}
                          {provider.providerCode === "tencent-cos" && (
                            <span>Bucket: {(provider.config as { bucket?: string }).bucket}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={provider.isActive ? "success" : "default"}
                          label={provider.isActive ? "启用" : "禁用"}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(provider.createdAt), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {provider.createdBy.name || "未知"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/storage-providers/${provider.id}`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            {!provider.isDefault && (
                              <DropdownMenuItem
                                onClick={() => handleSetDefault(provider.id, provider.providerName)}
                              >
                                <Star className="mr-2 h-4 w-4" />
                                设为默认
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(provider.id, provider.providerName, provider.isActive)
                              }
                            >
                              {provider.isActive ? (
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
                            {!provider.isDefault && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(provider.id, provider.providerName)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                删除
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
          </div>

          {initialData.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={initialData.page}
                totalPages={initialData.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.type === "delete" ? "确认删除" : "确认操作"}
        description={getConfirmMessage()}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
        confirmText={confirmDialog.type === "delete" ? "删除" : "确认"}
        variant={confirmDialog.type === "delete" ? "destructive" : "default"}
        isPending={isPending}
      />
    </>
  );
}