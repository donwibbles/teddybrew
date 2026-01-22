"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface ChatMessageProps {
  id: string;
  content: string;
  author: Author;
  createdAt: Date | string;
  isOwnMessage: boolean;
  canDelete: boolean;
  onDelete?: (messageId: string) => void;
  isDeleting?: boolean;
}

export function ChatMessage({
  id,
  content,
  author,
  createdAt,
  isOwnMessage,
  canDelete,
  onDelete,
  isDeleting,
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);

  const timestamp =
    createdAt instanceof Date ? createdAt : new Date(createdAt);
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

  const initials =
    author.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-2 hover:bg-neutral-50 transition-colors",
        isDeleting && "opacity-50"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={author.image || undefined} alt={author.name || ""} />
        <AvatarFallback className="bg-primary-100 text-primary-700 text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-medium text-sm",
              isOwnMessage ? "text-primary-700" : "text-neutral-900"
            )}
          >
            {author.name || "Anonymous"}
          </span>
          <span className="text-xs text-neutral-400">{timeAgo}</span>
        </div>
        <p className="text-sm text-neutral-700 break-words whitespace-pre-wrap">
          {content}
        </p>
      </div>

      {canDelete && showActions && (
        <div className="flex items-start">
          <button
            onClick={() => onDelete?.(id)}
            disabled={isDeleting}
            className="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded transition-colors"
            title="Delete message"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

interface ChatMessageSkeletonProps {
  count?: number;
}

export function ChatMessageSkeleton({ count = 5 }: ChatMessageSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 px-4 py-2 animate-pulse">
          <div className="h-9 w-9 rounded-full bg-neutral-200" />
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <div className="h-4 w-24 bg-neutral-200 rounded" />
              <div className="h-3 w-16 bg-neutral-100 rounded" />
            </div>
            <div className="h-4 w-3/4 bg-neutral-100 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
