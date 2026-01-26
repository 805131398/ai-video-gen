"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImageCountSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const IMAGE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8];

export function ImageCountSelector({
  value,
  onChange,
  disabled = false,
}: ImageCountSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">生成数量</label>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(Number(val))}
        disabled={disabled}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IMAGE_COUNT_OPTIONS.map((count) => (
            <SelectItem key={count} value={count.toString()}>
              {count} 张
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
