"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/admin";

// Types
interface LogItem {
  id: string;
  modelType: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
  latencyMs: number | null;
  status: string;
  errorMessage: string | null;
  requestUrl: string | null;
  taskId: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  project: { id: string; title: string } | null;
  modelConfig: { providerName: string; modelName: string };
}

interface LogDetail extends LogItem {
  requestBody: any;
  responseBody: any;
}

interface FilterOptions {
  users: Array<{ id: string; name: string | null; email: string }>;
  projects: Array<{ id: string; title: string }>;
  modelConfigs: Array<{
    id: string;
    providerName: string;
    modelName: string;
    modelType: string;
  }>;
}

const TIME_RANGES = [
  { value: "hour", label: "最近 1 小时" },
  { value: "day", label: "最近 24 小时" },
  { value: "week", label: "最近 7 天" },
  { value: "month", label: "最近 30 天" },
  { value: "all", label: "全部" },
];

const MODEL_TYPES = [
  { value: "all", label: "全部类型" },
  { value: "TEXT", label: "文本" },
  { value: "IMAGE", label: "图像" },
  { value: "VIDEO", label: "视频" },
  { value: "AUDIO", label: "音频" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "SUCCESS", label: "成功" },
  { value: "FAILED", label: "失败" },
  { value: "PENDING", label: "处理中" },
];

export default function AILogsPage() {
  // Data state
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Detail drawer state
  const [selectedLog, setSelectedLog] = useState<LogDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Filter state
  const [timeRange, setTimeRange] = useState("week");
  const [modelType, setModelType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userId, setUserId] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [modelConfigId, setModelConfigId] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [taskIdSearch, setTaskIdSearch] = useState("");

  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null
  );

  // Fetch filter options
  useEffect(() => {
    fetch("/api/admin/ai-logs/filters")
      .then((res) => res.json())
      .then((result) => {
        if (result.data) {
          setFilterOptions(result.data);
        }
      })
      .catch((err) => console.error("获取筛选选项失败:", err));
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      // Time range
      if (timeRange !== "all") {
        const now = new Date();
        let startDate: Date;
        switch (timeRange) {
          case "hour":
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case "day":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = now;
        }
        params.append("startDate", startDate.toISOString());
      }

      // Other filters
      if (modelType !== "all") params.append("modelType", modelType);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (userId !== "all") params.append("userId", userId);
      if (projectId !== "all") params.append("projectId", projectId);
      if (modelConfigId !== "all")
        params.append("modelConfigId", modelConfigId);
      if (keyword) params.append("keyword", keyword);
      if (taskIdSearch) params.append("taskId", taskIdSearch);

      const response = await fetch(`/api/admin/ai-logs?${params}`);
      const result = await response.json();

      if (result.data) {
        setLogs(result.data);
        setTotal(result.total);
      }
    } catch (error) {
      console.error("获取日志列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    timeRange,
    modelType,
    statusFilter,
    userId,
    projectId,
    modelConfigId,
    keyword,
    taskIdSearch,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, taskIdSearch]);

  // View detail
  const viewDetail = async (id: string) => {
    setIsDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const response = await fetch(`/api/admin/ai-logs/${id}`);
      const result = await response.json();
      if (result.data) {
        setSelectedLog(result.data);
      }
    } catch (error) {
      console.error("获取日志详情失败:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Filter by task ID
  const filterByTaskId = (taskId: string) => {
    setTaskIdSearch(taskId);
    setIsDetailOpen(false);
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            成功
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            失败
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            处理中
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI 调用日志</h1>
        <p className="text-slate-600 mt-2">
          查看所有 AI 模型调用记录，支持按任务追溯调用链
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                时间范围
              </label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                模型类型
              </label>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                状态
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                用户
              </label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择用户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部用户</SelectItem>
                  {filterOptions?.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                项目
              </label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部项目</SelectItem>
                  {filterOptions?.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                模型配置
              </label>
              <Select value={modelConfigId} onValueChange={setModelConfigId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模型</SelectItem>
                  {filterOptions?.modelConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.providerName} - {config.modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Third row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                关键词搜索
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索请求 URL 或错误信息"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                任务 ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="按任务 ID 筛选"
                  value={taskIdSearch}
                  onChange={(e) => setTaskIdSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            调用记录 ({total} 条)
          </CardTitle>
          <CardDescription>
            展示符合筛选条件的所有 AI 模型调用记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">时间</TableHead>
                  <TableHead className="w-[80px]">类型</TableHead>
                  <TableHead className="w-[180px]">模型</TableHead>
                  <TableHead className="w-[120px]">用户</TableHead>
                  <TableHead className="w-[120px]">项目</TableHead>
                  <TableHead className="min-w-[200px]">请求 URL</TableHead>
                  <TableHead className="w-[140px]">任务 ID</TableHead>
                  <TableHead className="w-[80px] text-right">延迟</TableHead>
                  <TableHead className="w-[80px] text-right">费用</TableHead>
                  <TableHead className="w-[100px]">状态</TableHead>
                  <TableHead className="w-[80px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs">
                        {format(
                          new Date(log.createdAt),
                          "yyyy-MM-dd HH:mm:ss",
                          { locale: zhCN }
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.modelType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {log.modelConfig.providerName}
                        </div>
                        <div className="text-slate-500">
                          {log.modelConfig.modelName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.user.name || log.user.email}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.project?.title || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono truncate max-w-[200px]">
                        {log.requestUrl || "-"}
                      </TableCell>
                      <TableCell>
                        {log.taskId ? (
                          <button
                            onClick={() => filterByTaskId(log.taskId!)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer font-mono"
                          >
                            {log.taskId.substring(0, 12)}...
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {log.latencyMs ? `${log.latencyMs}ms` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {log.cost ? `¥${log.cost.toFixed(4)}` : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetail(log.id)}
                          className="text-xs"
                        >
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / pageSize)}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="!max-w-3xl !w-[60vw] overflow-y-auto">
          {isDetailLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : selectedLog ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  日志详情
                  {getStatusBadge(selectedLog.status)}
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selectedLog.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    基本信息
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500 mb-1">调用时间</div>
                      <div className="font-medium">
                        {format(
                          new Date(selectedLog.createdAt),
                          "yyyy-MM-dd HH:mm:ss",
                          { locale: zhCN }
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">模型类型</div>
                      <div className="font-medium">{selectedLog.modelType}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">模型提供商</div>
                      <div className="font-medium">
                        {selectedLog.modelConfig.providerName}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">模型名称</div>
                      <div className="font-medium">
                        {selectedLog.modelConfig.modelName}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">用户</div>
                      <div className="font-medium">
                        {selectedLog.user.name || selectedLog.user.email}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">项目</div>
                      <div className="font-medium">
                        {selectedLog.project?.title || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">输入 Token</div>
                      <div className="font-medium">
                        {selectedLog.inputTokens?.toLocaleString() || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">输出 Token</div>
                      <div className="font-medium">
                        {selectedLog.outputTokens?.toLocaleString() || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">延迟</div>
                      <div className="font-medium">
                        {selectedLog.latencyMs
                          ? `${selectedLog.latencyMs}ms`
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">费用</div>
                      <div className="font-medium">
                        {selectedLog.cost
                          ? `¥${selectedLog.cost.toFixed(4)}`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task ID */}
                {selectedLog.taskId && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      任务关联
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            任务 ID
                          </div>
                          <code className="text-xs font-mono text-slate-900">
                            {selectedLog.taskId}
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => filterByTaskId(selectedLog.taskId!)}
                          className="text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          查看同任务日志
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Request */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    请求信息
                  </h3>
                  {selectedLog.requestUrl && (
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-1">
                        请求 URL
                      </div>
                      <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                        {selectedLog.requestUrl}
                      </code>
                    </div>
                  )}
                  {selectedLog.requestBody && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        请求体
                      </div>
                      <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-96 text-xs border border-slate-200">
                        {JSON.stringify(selectedLog.requestBody, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Response */}
                {selectedLog.responseBody && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      响应信息
                    </h3>
                    <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto max-h-96 text-xs border border-slate-200">
                      {JSON.stringify(selectedLog.responseBody, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {selectedLog.errorMessage && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      错误信息
                    </h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-900 break-words">
                          {selectedLog.errorMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
