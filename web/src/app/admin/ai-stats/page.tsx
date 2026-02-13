"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, DollarSign, CheckCircle, XCircle, Clock, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface AIStats {
  summary: {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    successRate: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    avgLatencyMs: number;
  };
  byModelType: {
    modelType: string;
    count: number;
    cost: number;
    inputTokens: number;
    outputTokens: number;
  }[];
  recentLogs: {
    id: string;
    modelType: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    latencyMs: number;
    status: string;
    errorMessage?: string;
    createdAt: string;
    user?: { name?: string; email?: string };
    modelConfig?: { providerName?: string; modelName?: string };
  }[];
}

const MODEL_TYPE_LABELS: Record<string, string> = {
  TEXT: "文本生成",
  IMAGE: "图片生成",
  VIDEO: "视频生成",
  VOICE: "语音生成",
};

const TIME_RANGES = [
  { value: "today", label: "今天" },
  { value: "week", label: "最近7天" },
  { value: "month", label: "最近30天" },
  { value: "all", label: "全部" },
];

function getDateRange(range: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const endDate = now.toISOString();

  switch (range) {
    case "today":
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: today.toISOString(), endDate };
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo.toISOString(), endDate };
    case "month":
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo.toISOString(), endDate };
    default:
      return {};
  }
}

export default function AIStatsPage() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");
  const [modelTypeFilter, setModelTypeFilter] = useState("all");

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const { startDate, endDate } = getDateRange(timeRange);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (modelTypeFilter !== "all") params.set("modelType", modelTypeFilter);

      const res = await fetch(`/api/admin/ai-stats?${params.toString()}`);
      const data = await res.json();
      if (data.data) {
        setStats(data.data);
      }
    } catch {
      toast.error("获取统计数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeRange, modelTypeFilter]);

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatTokens = (tokens: number) => tokens.toLocaleString();
  const formatLatency = (ms: number) => `${ms}ms`;
  const formatDate = (date: string) => new Date(date).toLocaleString("zh-CN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 使用统计"
        description="查看 AI 模型调用统计和费用分析"
      />

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="时间范围" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modelTypeFilter} onValueChange={setModelTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="模型类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {Object.entries(MODEL_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-slate-200 rounded w-20" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                总调用次数
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.summary.totalCalls}</div>
              <p className="text-xs text-slate-500 mt-1">
                成功率 {stats.summary.successRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                总费用
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCost(stats.summary.totalCost)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {formatTokens(stats.summary.totalInputTokens + stats.summary.totalOutputTokens)} tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                成功/失败
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className="text-emerald-600">{stats.summary.successCalls}</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-red-500">{stats.summary.failedCalls}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                平均延迟
              </CardTitle>
              <Zap className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatLatency(stats.summary.avgLatencyMs)}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* By Model Type */}
      {stats && stats.byModelType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">按模型类型统计</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型类型</TableHead>
                  <TableHead className="text-right">调用次数</TableHead>
                  <TableHead className="text-right">输入 Tokens</TableHead>
                  <TableHead className="text-right">输出 Tokens</TableHead>
                  <TableHead className="text-right">费用</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.byModelType.map((item) => (
                  <TableRow key={item.modelType}>
                    <TableCell>
                      <Badge variant="outline">
                        {MODEL_TYPE_LABELS[item.modelType] || item.modelType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">
                      {formatTokens(item.inputTokens)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatTokens(item.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCost(item.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      {stats && stats.recentLogs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">最近调用记录</CardTitle>
            <Link
              href="/admin/ai-logs"
              className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              查看全部 <ExternalLink className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">延迟</TableHead>
                  <TableHead className="text-right">费用</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {MODEL_TYPE_LABELS[log.modelType] || log.modelType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.modelConfig?.modelName || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {log.user?.name || log.user?.email || "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatTokens(log.inputTokens + log.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatLatency(log.latencyMs)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCost(log.cost)}
                    </TableCell>
                    <TableCell>
                      {log.status === "SUCCESS" ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/ai-logs?highlight=${log.id}`}
                        className="text-blue-500 hover:text-blue-700 text-xs cursor-pointer"
                      >
                        详情
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && stats && stats.recentLogs.length === 0 && (
        <Card className="p-8 text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无调用记录</p>
        </Card>
      )}
    </div>
  );
}
