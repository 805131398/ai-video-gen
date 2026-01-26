"use client";

import { ProjectCard } from "./ProjectCard";

interface Project {
  id: string;
  title: string;
  topic: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  coverUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectListProps {
  projects: Project[];
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export function ProjectList({
  projects,
  onDelete,
  emptyMessage = "暂无作品",
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          {...project}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
