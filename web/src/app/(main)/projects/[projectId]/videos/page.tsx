"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { VideoSelector } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

export default function VideosPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const { project, mutate } = useProject(projectId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videos = project?.steps?.videos?.options || [];
  const selectedIds = project?.steps?.videos?.selectedIds || [];

  const handleSelect = async (
    selectedVideos: { id: string; videoUrl: string; thumbnailUrl: string; duration: number }[]
  ) => {
    if (selectedVideos.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      // 选择视频
      const res = await fetch(`/api/projects/${projectId}/steps/videos/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: selectedVideos.map((v) => v.id) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "选择视频失败");
      }

      await mutate();
      router.push(`/projects/${projectId}/voice`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "选择视频失败";
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
      <VideoSelector
        videos={videos}
        onSelect={handleSelect}
        isLoading={isLoading}
        selectedIds={selectedIds}
      />
    </div>
  );
}
