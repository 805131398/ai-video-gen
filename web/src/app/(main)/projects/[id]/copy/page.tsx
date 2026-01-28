"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CopySelector } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

export default function CopyPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { project, mutate } = useProject(id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copies = project?.steps?.copies?.options || [];
  const selectedId = project?.steps?.copies?.selectedId;

  const handleSelect = async (copy: { id: string; content: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // 选择文案并生成图片
      const res = await fetch(`/api/projects/${id}/steps/copy/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyId: copy.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成图片失败");
      }

      await mutate();
      router.push(`/projects/${id}/images`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成图片失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!project?.steps?.attributes) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}/steps/attributes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes: project.steps.attributes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "重新生成文案失败");
      }

      await mutate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "重新生成文案失败";
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
      <CopySelector
        copies={copies}
        onSelect={handleSelect}
        onRegenerate={handleRegenerate}
        isLoading={isLoading}
        selectedId={selectedId || undefined}
      />
    </div>
  );
}
