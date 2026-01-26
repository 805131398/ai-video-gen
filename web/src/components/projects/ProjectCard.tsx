"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Edit, Trash2, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ProjectCardProps {
  id: string;
  title: string;
  topic: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  DRAFT: { label: "草稿", variant: "secondary" as const },
  IN_PROGRESS: { label: "进行中", variant: "default" as const },
  COMPLETED: { label: "已完成", variant: "default" as const },
  ARCHIVED: { label: "已归档", variant: "outline" as const },
};

export function ProjectCard({
  id,
  title,
  topic,
  status,
  coverUrl,
  createdAt,
  onDelete,
}: ProjectCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
      <Link href={`/projects/${id}`}>
        {/* Cover Image */}
        <div className="relative aspect-video bg-slate-100">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-12 h-12 text-slate-300" />
            </div>
          )}

          {/* Play overlay */}
          {status === "COMPLETED" && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-slate-800 ml-1" />
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-800 truncate">{title}</h3>
            <p className="text-sm text-slate-500 truncate mt-1">{topic}</p>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${id}`}>
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {new Date(createdAt).toLocaleDateString("zh-CN")}
          </div>
        </div>
      </div>
    </Card>
  );
}
