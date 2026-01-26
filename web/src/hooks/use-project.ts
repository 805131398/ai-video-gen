// useProject Hook - 项目数据获取 Hook

import useSWR from 'swr';
import { ProjectPageResponse } from '@/types/ai-video';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '获取项目失败');
  }
  return res.json();
};

interface UseProjectOptions {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
}

export function useProject(projectId: string | null, options: UseProjectOptions = {}) {
  const { refreshInterval = 0, revalidateOnFocus = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectPageResponse>(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  return {
    project: data,
    isLoading,
    isValidating,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
}

// 创建项目
export async function createProject(topic?: string): Promise<{ id: string }> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: topic || '' }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '创建项目失败');
  }

  return res.json();
}
