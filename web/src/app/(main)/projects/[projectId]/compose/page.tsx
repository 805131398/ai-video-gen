"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ComposePreview } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";
import { toast } from "sonner";

export default function ComposePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const { project, mutate } = useProject(projectId);
  const [isComposing, setIsComposing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoUrl = project?.steps?.compose?.videoUrl;

  const handleCompose = async () => {
    setIsComposing(true);
    setProgress(0);
    setError(null);

    // 模拟进度
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/compose/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      clearInterval(interval);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "视频合成失败");
      }

      setProgress(100);
      await mutate();
      toast.success("视频合成完成！");
    } catch (err) {
      clearInterval(interval);
      const message = err instanceof Error ? err.message : "视频合成失败";
      setError(message);
    } finally {
      setIsComposing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <AIErrorDisplay
          error={error}
          onRetry={handleCompose}
          onDismiss={() => setError(null)}
        />
      )}
      <ComposePreview
        videoUrl={videoUrl || undefined}
        isComposing={isComposing}
        progress={progress}
        onCompose={handleCompose}
      />
    </div>
  );
}
