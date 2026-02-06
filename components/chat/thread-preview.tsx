"use client";

import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ThreadPreviewProps {
  replyCount: number;
  latestRepliers?: Array<{ id: string; name: string | null; image: string | null }>;
  onViewThread: () => void;
}

export function ThreadPreview({
  replyCount,
  latestRepliers = [],
  onViewThread,
}: ThreadPreviewProps) {
  if (replyCount === 0) return null;

  return (
    <button
      onClick={onViewThread}
      className="flex items-center gap-2 mt-1 text-sm text-primary-600 hover:text-primary-700 hover:underline"
    >
      {/* Stacked avatars (max 3) */}
      {latestRepliers.length > 0 && (
        <div className="flex -space-x-1">
          {latestRepliers.slice(0, 3).map((user) => {
            const initials =
              user.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?";

            return (
              <Avatar key={user.id} className="h-5 w-5 border border-white">
                <AvatarImage src={user.image || undefined} alt={user.name || ""} />
                <AvatarFallback className="bg-primary-subtle-hover text-primary-700 text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </div>
      )}
      <span>
        {replyCount} {replyCount === 1 ? "reply" : "replies"}
      </span>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
