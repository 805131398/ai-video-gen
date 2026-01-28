"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESET_TONES = [
  "轻松搞笑",
  "悬疑紧张",
  "温情治愈",
  "励志向上",
  "浪漫唯美",
  "惊悚恐怖",
  "科幻未来",
  "历史厚重",
  "青春活力",
];

interface ToneComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ToneCombobox({
  value = "",
  onChange,
  placeholder = "选择或输入脚本基调",
  className,
}: ToneComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // 过滤选项
  const filteredTones = React.useMemo(() => {
    if (!searchValue) return PRESET_TONES;
    return PRESET_TONES.filter((tone) =>
      tone.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [searchValue]);

  // 处理选择
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  // 处理自定义输入
  const handleCustomInput = () => {
    if (searchValue.trim()) {
      onChange(searchValue.trim());
      setOpen(false);
      setSearchValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="搜索或输入自定义基调..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCustomInput();
              }
            }}
            className="mb-2"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredTones.length > 0 ? (
            <div className="p-1">
              {filteredTones.map((tone) => (
                <button
                  key={tone}
                  onClick={() => handleSelect(tone)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === tone && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === tone ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {tone}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchValue ? (
                <div>
                  <p>未找到匹配项</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCustomInput}
                    className="mt-2"
                  >
                    使用 &quot;{searchValue}&quot;
                  </Button>
                </div>
              ) : (
                <p>请输入搜索内容</p>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
