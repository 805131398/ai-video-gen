"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { createRole, updateRole } from "../actions";
import { toast } from "sonner";

const PERMISSION_GROUP_LABELS: Record<string, string> = {
  store: "门店管理",
  order: "订单管理",
  upgrade: "升级管理",
  user: "用户管理",
  role: "角色管理",
  system: "系统管理",
  other: "其他",
};

const roleSchema = z.object({
  name: z.string().min(1, "请输入角色名称"),
  code: z
    .string()
    .min(1, "请输入角色编码")
    .regex(/^[a-z_]+$/, "编码只能包含小写字母和下划线"),
  description: z.string().optional(),
  permissionIds: z.array(z.string()),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface Permission {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface RoleEditFormProps {
  role: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    isSystem: boolean;
    permissions: { permission: Permission }[];
  } | null;
  permissionGroups: Record<string, Permission[]>;
  isNew: boolean;
}

export function RoleEditForm({
  role,
  permissionGroups,
  isNew,
}: RoleEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name || "",
      code: role?.code || "",
      description: role?.description || "",
      permissionIds: role?.permissions.map((p) => p.permission.id) || [],
    },
  });

  const onSubmit = async (data: RoleFormData) => {
    setIsSubmitting(true);
    try {
      if (isNew) {
        await createRole(data);
        toast.success("角色创建成功");
      } else {
        await updateRole({ id: role!.id, ...data });
        toast.success("角色更新成功");
      }
      router.push("/admin/roles");
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败，请重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPermissions = form.watch("permissionIds");

  const togglePermission = (permissionId: string) => {
    const current = form.getValues("permissionIds");
    if (current.includes(permissionId)) {
      form.setValue(
        "permissionIds",
        current.filter((id) => id !== permissionId)
      );
    } else {
      form.setValue("permissionIds", [...current, permissionId]);
    }
  };

  const toggleGroup = (groupPermissions: Permission[]) => {
    const current = form.getValues("permissionIds");
    const groupIds = groupPermissions.map((p) => p.id);
    const allSelected = groupIds.every((id) => current.includes(id));

    if (allSelected) {
      form.setValue(
        "permissionIds",
        current.filter((id) => !groupIds.includes(id))
      );
    } else {
      const newIds = new Set([...current, ...groupIds]);
      form.setValue("permissionIds", Array.from(newIds));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色名称 *</FormLabel>
                  <FormControl>
                    <Input placeholder="如：门店审核员" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色编码 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="如：store_reviewer"
                      disabled={!isNew}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    编码创建后不可修改，只能包含小写字母和下划线
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder="角色描述..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权限配置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(permissionGroups).map(([group, permissions]) => (
                <div key={group} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={permissions.every((p) =>
                        selectedPermissions.includes(p.id)
                      )}
                      onCheckedChange={() => toggleGroup(permissions)}
                    />
                    <span className="font-medium">
                      {PERMISSION_GROUP_LABELS[group] || group}
                    </span>
                  </div>
                  <div className="ml-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-2"
                      >
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                        <div className="space-y-0.5">
                          <label className="text-sm font-medium leading-none cursor-pointer">
                            {permission.name}
                          </label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
