import { Suspense } from "react";
import { getStorageProviders, getProviderCodes } from "./actions";
import { StorageProviderListClient } from "./StorageProviderListClient";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    providerCode?: string;
    isActive?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function StorageProvidersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="存储配置"
        description="管理云存储服务配置，支持阿里云 OSS、AWS S3、腾讯云 COS"
        actions={
          <Button asChild>
            <Link href="/admin/storage-providers/new">
              <Plus className="mr-2 h-4 w-4" />
              新增存储配置
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<StorageProviderListSkeleton />}>
        <StorageProviderListContent
          search={params.search}
          providerCode={params.providerCode}
          isActive={params.isActive}
          page={params.page ? parseInt(params.page) : 1}
          pageSize={params.pageSize ? parseInt(params.pageSize) : 10}
        />
      </Suspense>
    </div>
  );
}

async function StorageProviderListContent({
  search,
  providerCode,
  isActive,
  page,
  pageSize,
}: {
  search?: string;
  providerCode?: string;
  isActive?: string;
  page: number;
  pageSize: number;
}) {
  const [data, codes] = await Promise.all([
    getStorageProviders({ search, providerCode, isActive, page, pageSize }),
    getProviderCodes(),
  ]);

  return (
    <StorageProviderListClient
      initialData={data}
      initialFilters={{ search, providerCode, isActive }}
      providerCodes={codes}
    />
  );
}

function StorageProviderListSkeleton() {
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
