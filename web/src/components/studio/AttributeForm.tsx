"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";

export interface CopyAttributes {
  perspective?: string;
  role?: string;
  gender?: string;
  age?: string;
  purpose?: string;
  emotion?: string;
  style?: string;
  duration?: string;
  audience?: string;
}

interface DictItem {
  value: string;
  label: string;
}

interface AttributeFormProps {
  onSubmit: (attributes: CopyAttributes) => void;
  isLoading?: boolean;
  defaultValues?: CopyAttributes;
  dictionaries?: Record<string, DictItem[]>;
}

const DEFAULT_DICTS: Record<string, DictItem[]> = {
  perspective: [
    { value: "first_person", label: "第一人称(我)" },
    { value: "second_person", label: "第二人称(你)" },
    { value: "third_person", label: "第三人称(他/她)" },
  ],
  role: [
    { value: "friend", label: "朋友" },
    { value: "expert", label: "专家" },
    { value: "teacher", label: "老师" },
    { value: "blogger", label: "博主" },
    { value: "ordinary", label: "普通人" },
  ],
  purpose: [
    { value: "recommend", label: "种草" },
    { value: "educate", label: "科普" },
    { value: "storytelling", label: "讲故事" },
    { value: "sell", label: "带货" },
    { value: "emotional", label: "情感共鸣" },
  ],
  emotion: [
    { value: "relaxed", label: "轻松" },
    { value: "serious", label: "严肃" },
    { value: "warm", label: "温馨" },
    { value: "excited", label: "激动" },
    { value: "calm", label: "平静" },
  ],
  style: [
    { value: "humorous", label: "幽默" },
    { value: "professional", label: "专业" },
    { value: "colloquial", label: "口语化" },
    { value: "literary", label: "文艺" },
    { value: "concise", label: "简洁" },
  ],
  duration: [
    { value: "15", label: "15秒" },
    { value: "30", label: "30秒" },
    { value: "60", label: "60秒" },
    { value: "90", label: "90秒" },
  ],
  audience: [
    { value: "youth", label: "年轻人" },
    { value: "professional", label: "职场人" },
    { value: "student", label: "学生" },
    { value: "mother", label: "宝妈" },
  ],
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  perspective: "叙事视角",
  role: "角色设定",
  purpose: "内容目的",
  emotion: "情绪风格",
  style: "表达风格",
  duration: "视频时长",
  audience: "目标受众",
};

export function AttributeForm({
  onSubmit,
  isLoading,
  defaultValues = {},
  dictionaries = DEFAULT_DICTS,
}: AttributeFormProps) {
  const [attributes, setAttributes] = useState<CopyAttributes>(defaultValues);

  // 只在 defaultValues 内容真正变化时更新
  const defaultValuesJson = JSON.stringify(defaultValues);
  useEffect(() => {
    setAttributes(JSON.parse(defaultValuesJson));
  }, [defaultValuesJson]);

  const handleChange = (key: keyof CopyAttributes, value: string) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onSubmit(attributes);
  };

  const dicts = { ...DEFAULT_DICTS, ...dictionaries };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <Select
              value={attributes[key as keyof CopyAttributes] || ""}
              onValueChange={(value) => handleChange(key as keyof CopyAttributes, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {dicts[key]?.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
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
              生成文案
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
