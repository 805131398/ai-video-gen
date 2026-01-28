"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/admin";
import { ConfirmDialog } from "@/components/admin";
import {
  Plus,
  Trash2,
  Copy,
  Download,
  Calendar,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ActivationCodeType, ActivationCodeStatus } from "@/generated/prisma/enums";

interface ActivationCode {
  id: string;
  code: string;
  type: ActivationCodeType;
  status: ActivationCodeStatus;
  userId: string | null;
  user: { id: string; name: string | null; phone: string | null } | null;
  usedAt: string | null;
  createdBy: string;
  creator: { id: string; name: string | null };
  createdAt: string;
}

interface StatsData {
  unused: number;
  used: number;
  todayActivated: number;
  monthActivated: number;
}

const TYPE_LABELS: Record<ActivationCodeType, string> = {
  MONTHLY: "月卡",
  QUARTERLY: "季卡",
  YEARLY: "年卡",
};

const STATUS_LABELS: Record<ActivationCodeStatus, string> = {
  UNUSED: "未使用",
  USED: "已使用",
};

export function CardKeysClient() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [stats, setStats] = useState<StatsData>({
    unused: 0,
    used: 0,
    todayActivated: 0,
    monthActivated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 筛选器状态
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // 对话框状态
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generateForm, setGenerateForm] = useState({
    type: "MONTHLY" as ActivationCodeType,
    quantity: 10,
  });
  const [generating, setGenerating] = useState(false);

  // 删除确认对话框
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: "",
    code: "",
  });
  const [batchDeleteDialog, setBatchDeleteDialog] = useState(false);

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const response = await fetch(`/api/admin/card-keys?${params}`);
      const result = await response.json();

      if (result.success) {
        setCodes(result.data.items);
        setTotal(result.data.total);
      } else {
        toast.error(result.error || "加载失败");
      }
    } catch (error) {
      console.error("加载卡密列表失败:", error);
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const [unusedRes, usedRes, todayRes, monthRes] = await Promise.all([
        fetch("/api/admin/card-keys?status=UNUSED&pageSize=1"),
        fetch("/api/admin/card-keys?status=USED&pageSize=1"),
        fetch("/api/admin/card-keys/stats?period=today"),
        fetch("/api/admin/card-keys/stats?period=month"),
      ]);

      const [unused, used, today, month] = await Promise.all([
        unusedRes.json(),
        usedRes.json(),
        todayRes.json(),
        monthRes.json(),
      ]);

      setStats({
        unused: unused.success ? unused.data.total : 0,
        used: used.success ? used.data.total : 0,
        todayActivated: today.success ? today.data.count : 0,
        monthActivated: month.success ? month.data.count : 0,
      });
    } catch (error) {
      console.error("加载统计数据失败:", error);
    }
  };

  useEffect(() => {
    loadData();
    loadStats();
  }, [page, statusFilter, typeFilter]);

  // 生成卡密
  const handleGenerate = async () => {
    if (generateForm.quantity < 1 || generateForm.quantity > 1000) {
      toast.error("生成数量必须在 1-1000 之间");
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch("/api/admin/card-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generateForm),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedCodes(result.data.codes);
        toast.success(`成功生成 ${result.data.codes.length} 个卡密`);
        loadData();
        loadStats();
      } else {
        toast.error(result.error || "生成失败");
      }
    } catch (error) {
      console.error("生成卡密失败:", error);
      toast.error("生成失败");
    } finally {
      setGenerating(false);
    }
  };

  // 复制卡密
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  // 复制所有生成的卡密
  const copyAllCodes = () => {
    const text = generatedCodes.join("\n");
    copyToClipboard(text);
  };

  // 导出卡密为文本文件
  const exportCodes = () => {
    const text = generatedCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activation-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("导出成功");
  };

  // 删除单个卡密
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/card-keys/${deleteDialog.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("删除成功");
        setDeleteDialog({ open: false, id: "", code: "" });
        loadData();
        loadStats();
      } else {
        toast.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除卡密失败:", error);
      toast.error("删除失败");
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    try {
      const response = await fetch("/api/admin/card-keys/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`成功删除 ${selectedIds.length} 个卡密`);
        setSelectedIds([]);
        setBatchDeleteDialog(false);
        loadData();
        loadStats();
      } else {
        toast.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("批量删除失败:", error);
      toast.error("删除失败");
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.length === codes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(codes.map((c) => c.id));
    }
  };

  // 切换单个选择
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader title="卡密管理" />

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未使用</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unused}</div>
            <p className="text-xs text-muted-foreground">可用卡密数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已使用</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.used}</div>
            <p className="text-xs text-muted-foreground">已激活卡密数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日激活</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayActivated}</div>
            <p className="text-xs text-muted-foreground">今天激活的数量</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本月激活</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthActivated}</div>
            <p className="text-xs text-muted-foreground">本月激活的数量</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setGenerateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                生成卡密
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setBatchDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  批量删除 ({selectedIds.length})
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="UNUSED">未使用</SelectItem>
                  <SelectItem value="USED">已使用</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="MONTHLY">月卡</SelectItem>
                  <SelectItem value="QUARTERLY">季卡</SelectItem>
                  <SelectItem value="YEARLY">年卡</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 卡密列表表格 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      codes.length > 0 && selectedIds.length === codes.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>卡密码</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>使用时间</TableHead>
                <TableHead>使用用户</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : codes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(code.id)}
                        onCheckedChange={() => toggleSelect(code.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <span>{code.code}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABELS[code.type]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          code.status === "UNUSED" ? "default" : "secondary"
                        }
                      >
                        {STATUS_LABELS[code.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(code.createdAt), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      {code.usedAt
                        ? format(new Date(code.usedAt), "yyyy-MM-dd HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {code.user
                        ? code.user.name || code.user.phone || "-"
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            id: code.id,
                            code: code.code,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              <div className="text-sm text-muted-foreground">
                共 {total} 条记录，第 {page} / {totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 生成卡密对话框 */}
      <Dialog
        open={generateDialogOpen}
        onOpenChange={(open) => {
          setGenerateDialogOpen(open);
          if (!open) {
            setGeneratedCodes([]);
            setGenerateForm({ type: "MONTHLY", quantity: 10 });
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>生成卡密</DialogTitle>
          </DialogHeader>

          {generatedCodes.length === 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>卡密类型</Label>
                <Select
                  value={generateForm.type}
                  onValueChange={(value) =>
                    setGenerateForm((prev) => ({
                      ...prev,
                      type: value as ActivationCodeType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">月卡 (30天)</SelectItem>
                    <SelectItem value="QUARTERLY">季卡 (90天)</SelectItem>
                    <SelectItem value="YEARLY">年卡 (365天)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>生成数量</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={generateForm.quantity}
                  onChange={(e) =>
                    setGenerateForm((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 1,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  可生成 1-1000 个卡密
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  成功生成 {generatedCodes.length} 个卡密
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyAllCodes}>
                    <Copy className="mr-2 h-4 w-4" />
                    复制全部
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportCodes}>
                    <Download className="mr-2 h-4 w-4" />
                    导出文件
                  </Button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto rounded-md border p-4">
                <div className="space-y-2 font-mono text-sm">
                  {generatedCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded bg-muted px-3 py-2"
                    >
                      <span>{code}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedCodes.length === 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setGenerateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "生成中..." : "生成"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setGenerateDialogOpen(false)}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
        title="删除卡密"
        description={`确定要删除卡密「${deleteDialog.code}」吗？此操作不可恢复。`}
        confirmText="删除"
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* 批量删除确认对话框 */}
      <ConfirmDialog
        open={batchDeleteDialog}
        onOpenChange={setBatchDeleteDialog}
        title="批量删除卡密"
        description={`确定要删除选中的 ${selectedIds.length} 个卡密吗？此操作不可恢复。`}
        confirmText="删除"
        onConfirm={handleBatchDelete}
        variant="destructive"
      />
    </div>
  );
}
