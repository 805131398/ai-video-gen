"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { BusinessType, FileRecord, FILE_LIMITS } from "@/lib/storage/types";
import { getAllowedCategories, formatFileSize } from "@/lib/storage/utils";
import { Upload, File, Image, Video, Music } from "lucide-react";

interface DropZoneProps {
  businessType: BusinessType;
  businessId?: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({
  businessType,
  accept,
  multiple = false,
  onFilesSelected,
  className,
  children,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const allowedCategories = getAllowedCategories(businessType);
  const acceptTypes = accept || allowedCategories
    .flatMap(cat => FILE_LIMITS[cat].types)
    .join(",");

  const maxSize = Math.max(
    ...allowedCategories.map(cat => FILE_LIMITS[cat].maxSize)
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected?.(multiple ? files : [files[0]]);
    }
  }, [multiple, onFilesSelected]);

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptTypes;
    input.multiple = multiple;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        onFilesSelected?.(files);
      }
    };
    input.click();
  }, [acceptTypes, multiple, onFilesSelected]);

  const categoryIcons = {
    image: Image,
    video: Video,
    audio: Music,
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
        isDragging
          ? "border-blue-500 bg-blue-50/50 scale-[1.02]"
          : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {children || (
        <>
          <div className="flex justify-center gap-2 mb-4">
            {allowedCategories.map(cat => {
              const Icon = categoryIcons[cat];
              return (
                <div
                  key={cat}
                  className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"
                >
                  <Icon className="h-6 w-6 text-slate-500" />
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">
                拖拽文件到此处上传
              </span>
            </div>
            <p className="text-xs text-slate-400">
              或点击选择文件 · 最大 {formatFileSize(maxSize)}
            </p>
            <p className="text-xs text-slate-400">
              支持格式: {allowedCategories.map(cat => {
                switch (cat) {
                  case "image": return "JPG, PNG, WebP, GIF";
                  case "video": return "MP4, WebM, MOV";
                  case "audio": return "MP3, WAV, OGG";
                }
              }).join(" / ")}
            </p>
          </div>
        </>
      )}

      {/* 拖拽覆盖层 */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg">
            <span className="text-sm font-medium text-blue-600">
              释放以上传文件
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
