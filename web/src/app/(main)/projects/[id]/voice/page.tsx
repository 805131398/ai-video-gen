"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { VoiceConfig } from "@/components/studio";
import { AIErrorDisplay } from "@/components/ui/ai-error-display";
import { useProject } from "@/hooks/use-project";

// Mock voices data
const MOCK_VOICES = [
  { id: "v1", name: "小明", gender: "male", language: "中文" },
  { id: "v2", name: "小红", gender: "female", language: "中文" },
  { id: "v3", name: "大卫", gender: "male", language: "中文" },
  { id: "v4", name: "艾米", gender: "female", language: "中文" },
];

export default function VoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { project, mutate } = useProject(id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取预览文本（选中的文案内容）
  const previewText = project?.steps?.copies?.options?.find(
    (c) => c.id === project?.steps?.copies?.selectedId
  )?.content?.slice(0, 100);

  const handleSubmit = async (config: { voiceId: string; speed: number; pitch: number }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}/steps/voice/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "生成配音失败");
      }

      await mutate();
      router.push(`/projects/${id}/compose`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "生成配音失败";
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
      <VoiceConfig
        voices={MOCK_VOICES}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        previewText={previewText}
      />
    </div>
  );
}
