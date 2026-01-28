import { redirect } from "next/navigation";
import { checkSuperAdmin } from "@/lib/permission";
import { CardKeysClient } from "./CardKeysClient";

export default async function CardKeysPage() {
  // 权限检查：仅超级管理员可访问
  const isSuperAdmin = await checkSuperAdmin();
  if (!isSuperAdmin) {
    redirect("/admin");
  }

  return <CardKeysClient />;
}
