"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Volume2, Play, Pause, Loader2 } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  gender: string;
  language: string;
}

interface VoiceConfigProps {
  voices: Voice[];
  onSubmit: (config: { voiceId: string; speed: number; pitch: number }) => void;
  isLoading?: boolean;
  previewText?: string;
}

export function VoiceConfig({
  voices,
  onSubmit,
  isLoading,
  previewText = "这是一段配音预览文本，用于测试配音效果。",
}: VoiceConfigProps) {
  const [voiceId, setVoiceId] = useState(voices[0]?.id || "");
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePreview = () => {
    setIsPlaying(!isPlaying);
    // 模拟播放
    if (!isPlaying) {
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  const handleSubmit = () => {
    onSubmit({ voiceId, speed, pitch });
  };

  const selectedVoice = voices.find((v) => v.id === voiceId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 配音角色选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">配音角色</label>
          <Select value={voiceId} onValueChange={setVoiceId}>
            <SelectTrigger>
              <SelectValue placeholder="选择配音角色" />
            </SelectTrigger>
            <SelectContent>
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender === "male" ? "男" : "女"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVoice && (
            <p className="text-xs text-slate-500">
              语言: {selectedVoice.language}
            </p>
          )}
        </div>

        {/* 语速调节 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            语速: {speed.toFixed(1)}x
          </label>
          <Slider
            value={[speed]}
            onValueChange={([v]) => setSpeed(v)}
            min={0.5}
            max={2}
            step={0.1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>
      </div>

      {/* 预览区域 */}
      <div className="p-4 bg-slate-50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">预览</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!voiceId}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isPlaying ? "暂停" : "试听"}
          </Button>
        </div>
        <p className="text-sm text-slate-600">{previewText}</p>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!voiceId || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 mr-2" />
              生成配音
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
