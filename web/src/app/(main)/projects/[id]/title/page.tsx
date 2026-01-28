"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TitleSelector } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

export default function TitlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { project, mutate } = useProject(id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles = project?.steps?.titles?.options || [];
  const selectedId = project?.steps?.titles?.selectedId;

  const handleSelect = async (title: { id: string; content: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // 先选择标题
      await fetch(`/api/projects/${id}/steps/title/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: title.id }),
      });

      await mutate();
      router.push(`/projects/${id}/attributes`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "选择标题失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!project?.topic) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}/steps/topic/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: project.topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "重新生成标题失败");
      }

      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "重新生成标题失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <AIErrorDisplay
          error={error}
          onRetry={handleRegenerate}
          onDismiss={() => setError(null)}
        />
      )}
      <TitleSelector
        titles={titles}
        onSelect={handleSelect}
        onRegenerate={handleRegenerate}
        isLoading={isLoading}
        selectedId={selectedId || undefined}
      />
    </div>
  );
}
