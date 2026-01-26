"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, RefreshCw } from "lucide-react";

interface CopyOption {
  id: string;
  content: string;
}

interface CopySelectorProps {
  copies: CopyOption[];
  onSelect: (copy: CopyOption) => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  selectedId?: string;
}

export function CopySelector({
  copies,
  onSelect,
  onRegenerate,
  isLoading,
  selectedId,
}: CopySelectorProps) {
  const [selected, setSelected] = useState<string | undefined>(selectedId);

  const handleSelect = (copy: CopyOption) => {
    setSelected(copy.id);
    onSelect(copy);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          选择一个文案
        </label>
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            重新生成
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {copies.map((copy) => (
          <Card
            key={copy.id}
            onClick={() => handleSelect(copy)}
            className={cn(
              "p-4 cursor-pointer transition-all hover:shadow-md",
              selected === copy.id
                ? "border-2 border-blue-500 bg-blue-50"
                : "border border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  selected === copy.id
                    ? "border-blue-500 bg-blue-500"
                    : "border-slate-300"
                )}
              >
                {selected === copy.id && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">
                {copy.content}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
