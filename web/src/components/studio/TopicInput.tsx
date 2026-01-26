"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  isLoading?: boolean;
  defaultValue?: string;
}

export function TopicInput({ onSubmit, isLoading, defaultValue = "" }: TopicInputProps) {
  const [topic, setTopic] = useState(defaultValue);

  const handleSubmit = () => {
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          输入你想创作的主题
        </label>
        <Textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="例如：分享一个护肤小技巧、推荐一款好用的咖啡机、讲述一段旅行经历..."
          className="min-h-[120px] resize-none"
          disabled={isLoading}
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!topic.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              生成标题
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
