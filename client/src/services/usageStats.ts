import { UsageStatsQuery, AiUsageLog, UsageStatsSummary, DailyUsageStat } from '../types';

export async function getAiUsageLogs(query: UsageStatsQuery): Promise<{ logs: AiUsageLog[]; total: number }> {
  return window.electron.db.getAiUsageLogs(query);
}

export async function getUsageStatsSummary(query: UsageStatsQuery): Promise<UsageStatsSummary> {
  return window.electron.db.getUsageStatsSummary(query);
}

export async function getDailyUsageStats(query: UsageStatsQuery): Promise<DailyUsageStat[]> {
  return window.electron.db.getDailyUsageStats(query);
}

export async function deleteAiUsageLog(logId: string): Promise<boolean> {
  return window.electron.db.deleteAiUsageLog(logId);
}

export async function clearAiUsageLogs(): Promise<boolean> {
  return window.electron.db.clearAiUsageLogs();
}
