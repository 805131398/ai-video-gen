"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AttributeForm, type CopyAttributes } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

export default function AttributesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const { mutate } = useProject(projectId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (attributes: CopyAttributes) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/attributes/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attributes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成文案失败");
      }

      await mutate();
      router.push(`/projects/${projectId}/copy`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成文案失败";
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
          onDismiss={() => setError(null)}
        />
      )}
      <AttributeForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
