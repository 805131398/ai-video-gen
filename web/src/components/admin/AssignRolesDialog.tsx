"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRoles: { id: string; name: string }[];
  availableRoles: Role[];
  onAssign: (userId: string, roleIds: string[]) => Promise<void>;
}

export function AssignRolesDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userRoles,
  availableRoles,
  onAssign,
}: AssignRolesDialogProps) {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 初始化选中的角色
  useEffect(() => {
    if (open) {
      setSelectedRoleIds(userRoles.map((r) => r.id));
    }
  }, [open, userRoles]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleAssign = async () => {
    setIsSubmitting(true);
    try {
      await onAssign(userId, selectedRoleIds);
      toast.success("角色分配成功");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "分配失败，请重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分配角色</DialogTitle>
          <DialogDescription>
            为用户「{userName}」分配系统角色
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无可用角色</p>
          ) : (
            availableRoles.map((role) => (
              <div key={role.id} className="flex items-start gap-3">
                <Checkbox
                  id={role.id}
                  checked={selectedRoleIds.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                />
                <div className="space-y-0.5">
                  <Label htmlFor={role.id} className="cursor-pointer">
                    {role.name}
                  </Label>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="button" onClick={handleAssign} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
