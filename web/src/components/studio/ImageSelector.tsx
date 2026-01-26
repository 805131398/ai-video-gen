"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";

interface ImageOption {
  id: string;
  imageUrl: string;
  revisedPrompt?: string;
}

interface ImageSelectorProps {
  images: ImageOption[];
  onSelect: (images: ImageOption[]) => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
  selectedIds?: string[];
  multiple?: boolean;
}

export function ImageSelector({
  images,
  onSelect,
  onRegenerate,
  isLoading,
  selectedIds = [],
  multiple = true,
}: ImageSelectorProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  const handleSelect = (image: ImageOption) => {
    let newSelected: string[];
    if (multiple) {
      if (selected.includes(image.id)) {
        newSelected = selected.filter((id) => id !== image.id);
      } else {
        newSelected = [...selected, image.id];
      }
    } else {
      newSelected = [image.id];
    }
    setSelected(newSelected);
    onSelect(images.filter((img) => newSelected.includes(img.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          选择图片 {multiple && `(已选 ${selected.length} 张)`}
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer group",
              "border-2 transition-all",
              selected.includes(image.id)
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-transparent hover:border-slate-300"
            )}
            onClick={() => handleSelect(image)}
          >
            <Image
              src={image.imageUrl}
              alt="Generated image"
              fill
              className="object-cover"
            />

            {/* 选中标记 */}
            {selected.includes(image.id) && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* 放大按钮 */}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <div className="relative aspect-[9/16] max-h-[80vh]">
                  <Image
                    src={image.imageUrl}
                    alt="Generated image"
                    fill
                    className="object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ))}
      </div>
    </div>
  );
}
