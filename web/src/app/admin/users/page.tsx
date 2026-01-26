import { Suspense } from "react";
import { getUsers, getAllRoles } from "./actions";
import { UserListClient } from "./UserListClient";
import { PageHeader } from "@/components/admin";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    isActive?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
      />

      <Suspense fallback={<UserListSkeleton />}>
        <UserListContent
          search={params.search}
          isActive={params.isActive}
          page={params.page ? parseInt(params.page) : 1}
          pageSize={params.pageSize ? parseInt(params.pageSize) : 10}
        />
      </Suspense>
    </div>
  );
}

async function UserListContent({
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
  const [data, availableRoles] = await Promise.all([
    getUsers({ search, isActive, page, pageSize }),
    getAllRoles(),
  ]);

  return (
    <UserListClient
      initialData={data}
      initialFilters={{ search, isActive }}
      availableRoles={availableRoles}
    />
  );
}

function UserListSkeleton() {
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
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
