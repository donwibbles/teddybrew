"use client";

import { getEmojiDisplay, type EmojiKey } from "@/lib/constants/emoji";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  counts: Record<string, number>;
  onToggle: (emoji: EmojiKey) => void;
  disabled?: boolean;
}

export function MessageReactions({
  counts,
  onToggle,
  disabled,
}: MessageReactionsProps) {
  // Filter out zero counts and sort by count (highest first)
  const reactions = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji as EmojiKey)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
            "bg-neutral-100 hover:bg-neutral-200 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <span>{getEmojiDisplay(emoji)}</span>
          <span className="text-neutral-600 font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}
