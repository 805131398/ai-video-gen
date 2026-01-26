"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { TopicInput } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const { project, mutate } = useProject(projectId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (topic: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/topic/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成标题失败");
      }

      await mutate();
      router.push(`/projects/${projectId}/title`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成标题失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (project?.topic) {
      handleSubmit(project.topic);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <AIErrorDisplay
          error={error}
          onRetry={project?.topic ? handleRetry : undefined}
          onDismiss={() => setError(null)}
        />
      )}
      <TopicInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        defaultValue={project?.steps?.topic?.value || ""}
      />
    </div>
  );
}
