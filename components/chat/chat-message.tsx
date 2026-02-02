"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Reply, Pin, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReplyPreview } from "./reply-preview";
import { MessageReactions } from "./message-reactions";
import { EmojiPicker } from "./emoji-picker";
import { ThreadPreview } from "./thread-preview";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/ui/role-badge";
import { ProfileLink } from "@/components/ui/profile-link";
import type { EmojiKey } from "@/lib/constants/emoji";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  role?: string | null;
  username?: string | null;
  isPublic?: boolean | null;
}

interface ReplyTo {
  id: string;
  content: string;
  author: { id: string; name: string | null };
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
  // Reply support
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
  onReply?: (messageId: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  canReply?: boolean;
  // Thread support
  depth?: number;
  replyCount?: number;
  onViewThread?: (threadRootId: string) => void;
  // Pinning support
  canPin?: boolean;
  isPinned?: boolean;
  onPin?: (messageId: string, isPinned: boolean) => void;
  // Reaction support
  reactionCounts?: Record<string, number>;
  onToggleReaction?: (messageId: string, emoji: EmojiKey) => void;
  // Pending message support
  isPending?: boolean;
  pendingStatus?: "queued" | "sending" | "failed";
  // Hide reply preview (useful in thread panel where context is clear)
  hideReplyPreview?: boolean;
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
  replyToId: _replyToId,
  replyTo,
  onReply,
  onScrollToMessage,
  canReply = true,
  depth = 0,
  replyCount = 0,
  onViewThread,
  canPin = false,
  isPinned = false,
  onPin,
  reactionCounts = {},
  onToggleReaction,
  isPending = false,
  pendingStatus,
  hideReplyPreview = false,
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

  const handleReplyClick = () => {
    if (replyTo && onScrollToMessage) {
      onScrollToMessage(replyTo.id);
    }
  };

  const handleReaction = (emoji: EmojiKey) => {
    onToggleReaction?.(id, emoji);
  };

  // Show reply button if depth < 2 (allow 2 levels of nesting)
  const showReplyButton = canReply && depth < 2;

  // Show thread preview only on root messages (depth 0) with replies
  const showThreadPreview = depth === 0 && replyCount > 0 && onViewThread;

  return (
    <div
      id={`message-${id}`}
      className={cn(
        "group relative flex gap-3 px-4 py-2 hover:bg-neutral-50 transition-colors",
        isDeleting && "opacity-50",
        isPending && "opacity-70",
        isPinned && "bg-amber-50/50"
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
        {/* Reply preview if this is a reply */}
        {replyTo && !hideReplyPreview && (
          <ReplyPreview
            authorName={replyTo.author.name || "Anonymous"}
            content={replyTo.content}
            onClick={handleReplyClick}
          />
        )}

        <div className="flex items-center gap-2">
          <ProfileLink
            user={author}
            className={cn(
              "font-medium text-sm hover:text-primary-600",
              isOwnMessage ? "text-primary-700" : "text-neutral-900"
            )}
          />
          {author.role && <RoleBadge role={author.role} size="sm" />}
          <span className="text-xs text-neutral-400">{timeAgo}</span>
          {/* Pending status indicator */}
          {isPending && pendingStatus === "sending" && (
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending...
            </span>
          )}
          {isPending && pendingStatus === "queued" && (
            <span className="text-xs text-neutral-400">Queued</span>
          )}
          {/* Pin indicator */}
          {isPinned && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Pin className="h-3 w-3" />
              Pinned
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-700 break-words whitespace-pre-wrap">
          {content}
        </p>

        {/* Reactions display */}
        {!isPending && (
          <MessageReactions
            counts={reactionCounts}
            onToggle={handleReaction}
            disabled={isDeleting}
          />
        )}

        {/* Thread preview */}
        {showThreadPreview && (
          <ThreadPreview
            replyCount={replyCount}
            onViewThread={() => onViewThread(id)}
          />
        )}
      </div>

      {/* Action buttons — floating toolbar */}
      {showActions && !isPending && (
        <div className="absolute -top-3 right-2 bg-white border border-neutral-200 rounded-lg shadow-sm px-1 flex items-center gap-0.5 z-10">
          {/* Emoji picker */}
          <EmojiPicker onSelect={handleReaction} disabled={isDeleting} />

          {/* Reply button */}
          {showReplyButton && onReply && (
            <button
              onClick={() => onReply(id)}
              disabled={isDeleting}
              className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Reply"
            >
              <Reply className="h-4 w-4" />
            </button>
          )}

          {/* Pin button */}
          {canPin && onPin && (
            <button
              onClick={() => onPin(id, !isPinned)}
              disabled={isDeleting}
              className={cn(
                "p-1.5 rounded transition-colors",
                isPinned
                  ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  : "text-neutral-400 hover:text-amber-600 hover:bg-amber-50"
              )}
              title={isPinned ? "Unpin message" : "Pin message"}
            >
              <Pin className="h-4 w-4" />
            </button>
          )}

          {/* Delete button */}
          {canDelete && (
            <button
              onClick={() => onDelete?.(id)}
              disabled={isDeleting}
              className="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded transition-colors"
              title="Delete message"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
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
