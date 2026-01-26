"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  user?: {
    image?: string | null;
    name?: string | null;
    email?: string | null;
    id?: string | null;
  };
}

/**
 * 用户头像组件（简化版）
 */
export function UserAvatar({
  src,
  alt,
  fallback,
  className,
  user
}: UserAvatarProps) {
  const imageSrc = user?.image || src;
  const fallbackText = user
    ? (user.name?.[0] || user.email?.[0] || "U").toUpperCase()
    : (fallback || "U").toUpperCase();
  const altText = user?.name || alt || "用户头像";

  return (
    <Avatar className={cn("h-10 w-10", className)}>
      <AvatarImage src={imageSrc || undefined} alt={altText} className="object-cover" />
      <AvatarFallback className="bg-muted flex items-center justify-center text-muted-foreground">
        {fallbackText}
      </AvatarFallback>
    </Avatar>
  );
}
