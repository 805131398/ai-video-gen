import { notFound, redirect } from "next/navigation";
import { getRoleById, getAllPermissions } from "../actions";
import { RoleEditForm } from "./RoleEditForm";
import { PageHeader } from "@/components/admin";
import { auth } from "@/lib/auth";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoleEditPage({ params }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const isNew = id === "new";

  const [role, permissionGroups] = await Promise.all([
    isNew ? null : getRoleById(id),
    getAllPermissions(),
  ]);

  if (!isNew && !role) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "新建角色" : "编辑角色"}
        description={isNew ? "创建新的系统角色" : `编辑角色：${role?.name}`}
      />

      <RoleEditForm
        role={role}
        permissionGroups={permissionGroups}
        isNew={isNew}
      />
    </div>
  );
}
