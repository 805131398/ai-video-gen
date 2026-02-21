import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Activity, Zap, Clock, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, X, Trash2, Search,
  MessageSquare, Image, Video, Music,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AiUsageLog, AiToolType, UsageStatsQuery, UsageStatsSummary, DailyUsageStat } from '../types';
import {
  getAiUsageLogs, getUsageStatsSummary, getDailyUsageStats,
  deleteAiUsageLog, clearAiUsageLogs,
} from '../services/usageStats';

const TOOL_TYPE_MAP: Record<AiToolType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  text_chat: { label: '对话', icon: MessageSquare },
  image_gen: { label: '图片', icon: Image },
  video_gen: { label: '视频', icon: Video },
  music_gen: { label: '音乐', icon: Music },
};

const TIME_RANGES = [
  { label: '今天', value: 'today' },
  { label: '7天', value: '7d' },
  { label: '30天', value: '30d' },
  { label: '全部', value: 'all' },
];

function getDateRange(range: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  switch (range) {
    case 'today': return { startDate: todayStart };
    case '7d': {
      const d = new Date(now.getTime() - 7 * 86400000);
      return { startDate: d.toISOString() };
    }
    case '30d': {
      const d = new Date(now.getTime() - 30 * 86400000);
      return { startDate: d.toISOString() };
    }
    default: return {};
  }
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number | null): string {
  if (!n) return '-';
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function UsageStats() {
  const [timeRange, setTimeRange] = useState('7d');
  const [toolTypeFilter, setToolTypeFilter] = useState<AiToolType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'success' | 'error' | ''>('');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [summary, setSummary] = useState<UsageStatsSummary>({
    totalCount: 0, successCount: 0, errorCount: 0, totalTokens: 0, totalDurationMs: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyUsageStat[]>([]);
  const [logs, setLogs] = useState<AiUsageLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 详情抽屉
  const [selectedLog, setSelectedLog] = useState<AiUsageLog | null>(null);

  const buildQuery = useCallback((): UsageStatsQuery => {
    const range = getDateRange(timeRange);
    return {
      ...range,
      toolType: toolTypeFilter || undefined,
      status: statusFilter || undefined,
      page,
      pageSize,
    };
  }, [timeRange, toolTypeFilter, statusFilter, page]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = buildQuery();
      const [summaryData, dailyData, logsData] = await Promise.all([
        getUsageStatsSummary(query),
        getDailyUsageStats(query),
        getAiUsageLogs(query),
      ]);
      setSummary(summaryData);
      setDailyStats(dailyData);
      setLogs(logsData.logs);
      setTotal(logsData.total);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // 筛选变化时重置页码
  useEffect(() => { setPage(1); }, [timeRange, toolTypeFilter, statusFilter]);

  const handleDelete = async (logId: string) => {
    await deleteAiUsageLog(logId);
    if (selectedLog?.id === logId) setSelectedLog(null);
    loadData();
  };

  const handleClearAll = async () => {
    if (!confirm('确定清空所有使用日志？此操作不可恢复。')) return;
    await clearAiUsageLogs();
    setSelectedLog(null);
    loadData();
  };

  const totalPages = Math.ceil(total / pageSize);
  const successRate = summary.totalCount > 0
    ? ((summary.successCount / summary.totalCount) * 100).toFixed(1)
    : '0';

  return (
    <div className="h-full flex flex-col">
      {/* 筛选栏 */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <span className="text-base font-medium text-slate-800 mr-2">使用统计</span>

        {/* 时间范围 */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                timeRange === r.value
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 类型筛选 */}
        <select
          value={toolTypeFilter}
          onChange={(e) => setToolTypeFilter(e.target.value as AiToolType | '')}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部类型</option>
          {Object.entries(TOOL_TYPE_MAP).map(([type, { label }]) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>

        {/* 状态筛选 */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'success' | 'error' | '')}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
        </select>

        <div className="flex-1" />

        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          清空日志
        </button>
      </div>

      {/* 汇总 + 趋势图 */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 flex-shrink-0">
        {/* 统计卡片 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-800">{summary.totalCount}</div>
            <div className="text-xs text-slate-500">总调用次数</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-800">{formatTokens(summary.totalTokens)}</div>
            <div className="text-xs text-slate-500">总 Token 消耗</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-800">{successRate}%</div>
            <div className="text-xs text-slate-500">成功率</div>
          </div>
        </div>

        {/* 趋势图 */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 row-span-1">
          <div className="text-xs text-slate-500 mb-2">调用趋势</div>
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={dailyStats}>
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, padding: '4px 8px' }}
                  formatter={(value: any) => [`${value} 次`, '调用']}
                  labelFormatter={(label: any) => `${label}`}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[60px] flex items-center justify-center text-xs text-slate-400">暂无数据</div>
          )}
        </div>
      </div>

      {/* 日志表格 */}
      <div className="flex-1 flex overflow-hidden px-6 pb-4">
        <div className={`flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden ${selectedLog ? 'mr-4' : ''}`}>
          {/* 表头 */}
          <div className="grid grid-cols-[140px_80px_1fr_70px_80px_80px_1fr_50px] gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500">
            <div>时间</div>
            <div>类型</div>
            <div>模型</div>
            <div>状态</div>
            <div className="text-right">Token</div>
            <div className="text-right">耗时</div>
            <div>用户输入</div>
            <div></div>
          </div>

          {/* 表体 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">加载中...</div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <BarChart3 className="w-12 h-12 mb-3 text-slate-300" />
                <div className="text-sm">暂无使用记录</div>
                <div className="text-xs mt-1">使用 AI 工具后，日志将自动记录在这里</div>
              </div>
            ) : (
              logs.map((log) => {
                const toolInfo = TOOL_TYPE_MAP[log.toolType as AiToolType];
                const Icon = toolInfo?.icon || Activity;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`grid grid-cols-[140px_80px_1fr_70px_80px_80px_1fr_50px] gap-2 px-4 py-2.5 border-b border-slate-100 text-sm cursor-pointer transition-colors hover:bg-slate-50 ${
                      selectedLog?.id === log.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="text-slate-500 text-xs leading-5">{formatDate(log.createdAt)}</div>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600">{toolInfo?.label || log.toolType}</span>
                    </div>
                    <div className="text-slate-700 truncate text-xs leading-5">{log.modelName || '-'}</div>
                    <div>
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> 成功
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="w-3 h-3" /> 失败
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-600 leading-5">{formatTokens(log.totalTokens)}</div>
                    <div className="text-right text-xs text-slate-600 leading-5">{formatDuration(log.durationMs)}</div>
                    <div className="text-xs text-slate-500 truncate leading-5">{log.userInput || '-'}</div>
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(log.id); }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-500">
                共 {total} 条，第 {page}/{totalPages} 页
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 text-xs rounded cursor-pointer ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 详情抽屉 */}
        {selectedLog && (
          <div className="w-[400px] flex-shrink-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-medium text-slate-800">日志详情</span>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* 基础信息 */}
              <section>
                <h4 className="text-slate-500 font-medium mb-2">基础信息</h4>
                <div className="grid grid-cols-2 gap-2">
                  <InfoItem label="操作类型" value={TOOL_TYPE_MAP[selectedLog.toolType as AiToolType]?.label || selectedLog.toolType} />
                  <InfoItem label="模型" value={selectedLog.modelName || '-'} />
                  <InfoItem label="状态" value={selectedLog.status === 'success' ? '成功' : '失败'} />
                  <InfoItem label="耗时" value={formatDuration(selectedLog.durationMs)} />
                  <InfoItem label="时间" value={new Date(selectedLog.createdAt).toLocaleString('zh-CN')} />
                  <InfoItem label="会话 ID" value={selectedLog.conversationId?.slice(0, 8) || '-'} />
                </div>
              </section>

              {/* Token 信息 */}
              <section>
                <h4 className="text-slate-500 font-medium mb-2">Token 消耗</h4>
                <div className="grid grid-cols-3 gap-2">
                  <InfoItem label="Prompt" value={formatTokens(selectedLog.promptTokens)} />
                  <InfoItem label="Completion" value={formatTokens(selectedLog.completionTokens)} />
                  <InfoItem label="Total" value={formatTokens(selectedLog.totalTokens)} />
                </div>
              </section>

              {/* 请求参数 */}
              <section>
                <h4 className="text-slate-500 font-medium mb-2">请求参数</h4>
                <div className="grid grid-cols-2 gap-2">
                  <InfoItem label="Base URL" value={selectedLog.baseUrl || '-'} />
                  <InfoItem label="Temperature" value={selectedLog.temperature?.toString() || '-'} />
                  <InfoItem label="Max Tokens" value={selectedLog.maxTokens?.toString() || '-'} />
                </div>
              </section>

              {/* 用户输入 */}
              {selectedLog.userInput && (
                <section>
                  <h4 className="text-slate-500 font-medium mb-2">用户输入</h4>
                  <div className="bg-slate-50 rounded-lg p-3 text-slate-700 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                    {selectedLog.userInput}
                  </div>
                </section>
              )}

              {/* AI 输出摘要 */}
              {selectedLog.aiOutput && (
                <section>
                  <h4 className="text-slate-500 font-medium mb-2">AI 输出摘要</h4>
                  <div className="bg-slate-50 rounded-lg p-3 text-slate-700 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
                    <RichOutput content={selectedLog.aiOutput} toolType={selectedLog.toolType} />
                  </div>
                </section>
              )}

              {/* 错误信息 */}
              {selectedLog.errorMessage && (
                <section>
                  <h4 className="text-red-500 font-medium mb-2">错误信息</h4>
                  <div className="bg-red-50 rounded-lg p-3 text-red-700 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                    {selectedLog.errorMessage}
                  </div>
                </section>
              )}

              {/* Request Body */}
              {selectedLog.requestBody && (
                <section>
                  <h4 className="text-slate-500 font-medium mb-2">Request Body</h4>
                  <pre className="bg-slate-800 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto text-[11px] leading-relaxed">
                    {tryFormatJson(selectedLog.requestBody)}
                  </pre>
                </section>
              )}

              {/* Response Body */}
              {selectedLog.responseBody && (
                <section>
                  <h4 className="text-slate-500 font-medium mb-2">Response Body</h4>
                  <pre className="bg-slate-800 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto text-[11px] leading-relaxed">
                    {selectedLog.responseBody.length > 3000
                      ? selectedLog.responseBody.slice(0, 3000) + '\n... (truncated)'
                      : selectedLog.responseBody}
                  </pre>
                </section>
              )}

              {/* 扩展数据 */}
              {selectedLog.extraData && (
                <section>
                  <h4 className="text-slate-500 font-medium mb-2">扩展数据</h4>
                  <pre className="bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-32 overflow-y-auto text-[11px]">
                    {tryFormatJson(selectedLog.extraData)}
                  </pre>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-slate-400 text-[10px] mb-0.5">{label}</div>
      <div className="text-slate-700 truncate" title={value}>{value}</div>
    </div>
  );
}

// 从文本中提取图片 URL
function extractImageUrls(text: string): string[] {
  const urls: string[] = [];
  // 匹配 markdown 图片语法 ![alt](url)
  const mdRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }
  // 匹配独立的图片 URL
  const urlRegex = /(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp)(?:\?[^\s"'<>]*)?)/gi;
  while ((match = urlRegex.exec(text)) !== null) {
    if (!urls.includes(match[1])) urls.push(match[1]);
  }
  return urls;
}

function RichOutput({ content, toolType }: { content: string; toolType: string }) {
  const isImageType = toolType === 'image_gen';
  const imageUrls = extractImageUrls(content);

  if (isImageType && imageUrls.length > 0) {
    // 去掉已展示的图片 URL 后的剩余文本
    let remainingText = content;
    for (const url of imageUrls) {
      remainingText = remainingText.replace(url, '').replace(/!\[.*?\]\(\s*\)/, '');
    }
    remainingText = remainingText.trim();

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {imageUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={url}
                alt={`生成图片 ${i + 1}`}
                className="w-full rounded-lg border border-slate-200 object-cover max-h-40 cursor-pointer hover:opacity-90 transition-opacity"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </a>
          ))}
        </div>
        {remainingText && <div className="text-xs text-slate-500 mt-1">{remainingText}</div>}
      </div>
    );
  }

  return <>{content}</>;
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
