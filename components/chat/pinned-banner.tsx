"use client";

import { useState } from "react";
import { Pin, ChevronDown, X } from "lucide-react";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface PinnedMessage {
  id: string;
  content: string;
  author: Author;
  pinnedAt?: Date | string | null;
}

interface PinnedBannerProps {
  pinnedMessages: PinnedMessage[];
  onJumpToMessage: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  canModerate: boolean;
}

export function PinnedBanner({
  pinnedMessages,
  onJumpToMessage,
  onUnpin,
  canModerate,
}: PinnedBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center gap-2 text-amber-800 hover:bg-amber-100 transition-colors"
      >
        <Pin className="h-4 w-4" />
        <span className="text-sm font-medium">
          {pinnedMessages.length} pinned message
          {pinnedMessages.length > 1 ? "s" : ""}
        </span>
        <ChevronDown
          className={`h-4 w-4 ml-auto transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {pinnedMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start justify-between gap-2 text-sm"
            >
              <button
                onClick={() => onJumpToMessage(msg.id)}
                className="text-left hover:bg-amber-100 rounded px-2 py-1 -mx-2 flex-1 min-w-0"
              >
                <span className="font-medium text-amber-900">
                  {msg.author.name || "Anonymous"}:
                </span>{" "}
                <span className="text-amber-700">
                  {msg.content.slice(0, 100)}
                  {msg.content.length > 100 ? "..." : ""}
                </span>
              </button>
              {canModerate && onUnpin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(msg.id);
                  }}
                  className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded shrink-0"
                  title="Unpin message"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
