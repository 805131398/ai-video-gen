import { Suspense } from "react";
import { getMenus } from "./actions";
import { MenuListClient } from "./MenuListClient";
import { PageHeader } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    isActive?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function MenusPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="菜单管理"
        actions={
          <Button asChild>
            <Link href="/admin/menus/new">
              <Plus className="mr-2 h-4 w-4" />
              新增菜单
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<MenuListSkeleton />}>
        <MenuListContent
          search={params.search}
          isActive={params.isActive}
          page={params.page ? parseInt(params.page) : 1}
          pageSize={params.pageSize ? parseInt(params.pageSize) : 10}
        />
      </Suspense>
    </div>
  );
}

async function MenuListContent({
  search,
  isActive,
  page,
  pageSize,
}: {
  search?: string;
  isActive?: string;
  page: number;
  pageSize: number;
}) {
  const data = await getMenus({ search, isActive, page, pageSize });

  return (
    <MenuListClient
      initialData={data}
      initialFilters={{ search, isActive }}
    />
  );
}

function MenuListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[250px]" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 py-4">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
