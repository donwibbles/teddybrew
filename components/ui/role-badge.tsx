import type { MemberRole } from "@prisma/client";
import { Badge } from "./badge";

interface RoleBadgeProps {
  role: MemberRole | string;
  size?: "sm" | "default";
}

/**
 * Single source of truth for role badges
 * Shows Owner/Mod badges based on member role
 */
export function RoleBadge({ role, size = "default" }: RoleBadgeProps) {
  const sizeClasses = size === "sm" ? "px-1.5 py-0 text-[10px]" : "";

  if (role === "OWNER") {
    return (
      <Badge
        variant="warning"
        className={sizeClasses}
      >
        Owner
      </Badge>
    );
  }

  if (role === "MODERATOR") {
    return (
      <Badge
        variant="default"
        className={sizeClasses}
      >
        Mod
      </Badge>
    );
  }

  // Members don't get a badge
  return null;
}
