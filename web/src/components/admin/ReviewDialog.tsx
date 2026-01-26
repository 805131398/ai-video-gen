"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  action: "approve" | "reject";
  onConfirm: (rejectReason?: string) => void | Promise<void>;
  isLoading?: boolean;
}

export function ReviewDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  onConfirm,
  isLoading = false,
}: ReviewDialogProps) {
  const [rejectReason, setRejectReason] = useState("");

  const handleConfirm = () => {
    if (action === "reject") {
      onConfirm(rejectReason);
    } else {
      onConfirm();
    }
    setRejectReason("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {action === "reject" && (
          <div className="space-y-2">
            <Label htmlFor="rejectReason">驳回原因 *</Label>
            <Textarea
              id="rejectReason"
              placeholder="请输入驳回原因..."
              value={rejectReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={
              isLoading || (action === "reject" && !rejectReason.trim())
            }
            className={
              action === "reject"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {isLoading ? "处理中..." : action === "approve" ? "通过" : "驳回"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
