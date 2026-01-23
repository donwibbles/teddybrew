"use client";

import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplyPreviewProps {
  authorName: string;
  content: string;
  onClick?: () => void;
  className?: string;
}

export function ReplyPreview({
  authorName,
  content,
  onClick,
  className,
}: ReplyPreviewProps) {
  // Truncate content to 100 chars
  const truncated = content.length > 100 ? content.slice(0, 100) + "..." : content;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-2 px-3 py-2 mb-1 rounded-lg",
        "bg-neutral-100 border-l-2 border-primary-400",
        "text-left text-xs hover:bg-neutral-200 transition-colors w-full",
        className
      )}
    >
      <Reply className="h-3 w-3 text-neutral-400 mt-0.5 shrink-0 rotate-180" />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-neutral-700">{authorName}</span>
        <p className="text-neutral-500 truncate">{truncated}</p>
      </div>
    </button>
  );
}
