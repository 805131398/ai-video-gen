"use client";

import { useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFileUpload } from "@/hooks/useFileUpload";
import { BusinessType, FileRecord, FILE_LIMITS, FileCategory } from "@/lib/storage/types";
import { formatFileSize, getFileCategory, getAllowedCategories } from "@/lib/storage/utils";
import { Upload, X, File, Image, Video, Music, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploaderProps {
  businessType: BusinessType;
  businessId?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onUploadComplete?: (files: FileRecord[]) => void;
  onError?: (error: Error) => void;
  className?: string;
}

interface FileItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  result?: FileRecord;
  error?: string;
}

const FILE_ICONS: Record<FileCategory, typeof File> = {
  image: Image,
  video: Video,
  audio: Music,
};

export function FileUploader({
  businessType,
  businessId,
  accept,
  multiple = false,
  maxFiles = 10,
  onUploadComplete,
  onError,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedCategories = getAllowedCategories(businessType);

  const acceptTypes = accept || allowedCategories
    .flatMap(cat => FILE_LIMITS[cat].types)
    .join(",");

  const { upload } = useFileUpload({
    businessType,
    businessId,
    onError,
  });

  const handleFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).slice(0, maxFiles - files.length);

    const newItems: FileItem[] = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "pending" as const,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newItems]);

    const results: FileRecord[] = [];

    for (const item of newItems) {
      setFiles(prev =>
        prev.map(f =>
          f.id === item.id ? { ...f, status: "uploading" as const } : f
        )
      );

      try {
        const result = await new Promise<FileRecord | null>((resolve) => {
          const uploader = useFileUploadInternal({
            businessType,
            businessId,
            file: item.file,
            onProgress: (progress) => {
              setFiles(prev =>
                prev.map(f =>
                  f.id === item.id ? { ...f, progress } : f
                )
              );
            },
            onComplete: resolve,
          });
          uploader();
        });

        if (result) {
          results.push(result);
          setFiles(prev =>
            prev.map(f =>
              f.id === item.id
                ? { ...f, status: "success" as const, progress: 100, result }
                : f
            )
          );
        }
      } catch (error) {
        setFiles(prev =>
          prev.map(f =>
            f.id === item.id
              ? { ...f, status: "error" as const, error: (error as Error).message }
              : f
          )
        );
      }
    }

    if (results.length > 0) {
      onUploadComplete?.(results);
    }
  }, [businessType, businessId, files.length, maxFiles, onUploadComplete]);

  // 简化的内部上传函数
  function useFileUploadInternal(opts: {
    businessType: BusinessType;
    businessId?: string;
    file: File;
    onProgress: (p: number) => void;
    onComplete: (r: FileRecord | null) => void;
  }) {
    return async () => {
      try {
        const urlRes = await fetch('/api/storage/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: opts.file.name,
            mimeType: opts.file.type,
            size: opts.file.size,
            businessType: opts.businessType,
            businessId: opts.businessId,
          }),
        });

        if (!urlRes.ok) throw new Error('获取上传 URL 失败');
        const { data: urlData } = await urlRes.json();
        opts.onProgress(10);

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              opts.onProgress(Math.round(10 + (e.loaded / e.total) * 80));
            }
          };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('上传失败'));
          xhr.onerror = () => reject(new Error('网络错误'));
          xhr.open('PUT', urlData.url);
          xhr.setRequestHeader('Content-Type', opts.file.type);
          xhr.send(opts.file);
        });

        opts.onProgress(90);

        const callbackRes = await fetch('/api/storage/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: urlData.key,
            size: opts.file.size,
            mimeType: opts.file.type,
            originalName: opts.file.name,
            businessType: opts.businessType,
            businessId: opts.businessId,
          }),
        });

        if (!callbackRes.ok) throw new Error('上传回调失败');
        const { data } = await callbackRes.json();
        opts.onProgress(100);
        opts.onComplete(data);
      } catch (error) {
        opts.onComplete(null);
        throw error;
      }
    };
  }

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const getFileIcon = (file: File) => {
    const category = getFileCategory(file.type);
    const Icon = category ? FILE_ICONS[category] : File;
    return <Icon className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 拖拽上传区域 */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="h-10 w-10 mx-auto text-slate-400 mb-3" />
        <p className="text-sm text-slate-600 mb-1">
          拖拽文件到此处，或点击选择文件
        </p>
        <p className="text-xs text-slate-400">
          支持 {allowedCategories.join("、")} 格式
        </p>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
            >
              {getFileIcon(item.file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatFileSize(item.file.size)}
                </p>
                {item.status === "uploading" && (
                  <Progress value={item.progress} className="h-1 mt-1" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.status === "success" && (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                )}
                {item.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                {item.status !== "uploading" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
