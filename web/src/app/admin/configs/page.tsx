import { Suspense } from "react";
import { getConfigs, getConfigGroups } from "./actions";
import { ConfigListClient } from "./ConfigListClient";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    groupCode?: string;
    env?: string;
    isActive?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function ConfigsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统配置"
        actions={
          <Button asChild>
            <Link href="/admin/configs/new">
              <Plus className="mr-2 h-4 w-4" />
              新增配置
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<ConfigListSkeleton />}>
        <ConfigListContent
          search={params.search}
          groupCode={params.groupCode}
          env={params.env}
          isActive={params.isActive}
          page={params.page ? parseInt(params.page) : 1}
          pageSize={params.pageSize ? parseInt(params.pageSize) : 10}
        />
      </Suspense>
    </div>
  );
}

async function ConfigListContent({
  search,
  groupCode,
  env,
  isActive,
  page,
  pageSize,
}: {
  search?: string;
  groupCode?: string;
  env?: string;
  isActive?: string;
  page: number;
  pageSize: number;
}) {
  const [data, groups] = await Promise.all([
    getConfigs({ search, groupCode, env, isActive, page, pageSize }),
    getConfigGroups(),
  ]);

  return (
    <ConfigListClient
      initialData={data}
      initialFilters={{ search, groupCode, env, isActive }}
      configGroups={groups}
    />
  );
}

function ConfigListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[250px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-4">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
