"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ImageSelector } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

export default function ImagesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const { project, mutate } = useProject(projectId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = project?.steps?.images?.options || [];
  const selectedIds = project?.steps?.images?.selectedIds || [];

  const handleSelect = async (selectedImages: { id: string; imageUrl: string }[]) => {
    if (selectedImages.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // 选择图片并生成视频
      const res = await fetch(`/api/projects/${projectId}/steps/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: selectedImages.map((img) => img.id) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成视频失败");
      }

      await mutate();
      router.push(`/projects/${projectId}/videos`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成视频失败";
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
      <ImageSelector
        images={images}
        onSelect={handleSelect}
        isLoading={isLoading}
        selectedIds={selectedIds}
      />
    </div>
  );
}
