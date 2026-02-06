"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Shield, FileText, MessageSquare, Trash2, Pin, PinOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getModerationLogs } from "@/lib/actions/membership";
import { EmptyState } from "@/components/ui/empty-state";

interface Moderator {
  id: string;
  name: string | null;
  image: string | null;
}

interface LogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  targetTitle: string | null;
  createdAt: Date | string;
  moderator: Moderator;
}

interface ModerationLogProps {
  communityId: string;
}

const actionIcons: Record<string, typeof Trash2> = {
  DELETE_POST: Trash2,
  DELETE_COMMENT: Trash2,
  DELETE_MESSAGE: Trash2,
  PIN_POST: Pin,
  UNPIN_POST: PinOff,
};

const actionLabels: Record<string, string> = {
  DELETE_POST: "deleted a post",
  DELETE_COMMENT: "deleted a comment",
  DELETE_MESSAGE: "deleted a message",
  PIN_POST: "pinned a post",
  UNPIN_POST: "unpinned a post",
};

const targetTypeIcons: Record<string, typeof FileText> = {
  Post: FileText,
  Comment: MessageSquare,
  Message: MessageSquare,
};

export function ModerationLog({ communityId }: ModerationLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const loadLogs = async (loadCursor?: string) => {
    setIsLoading(true);
    const result = await getModerationLogs(communityId, loadCursor);

    if (loadCursor) {
      setLogs((prev) => [...prev, ...result.logs]);
    } else {
      setLogs(result.logs);
    }

    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoading(false);
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const loadMore = () => {
    if (cursor) {
      loadLogs(cursor);
    }
  };

  if (!isLoading && logs.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="No moderation activity"
        description="Moderation actions will appear here when posts, comments, or messages are moderated."
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const timestamp =
          log.createdAt instanceof Date
            ? log.createdAt
            : new Date(log.createdAt);
        const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });

        const ActionIcon = actionIcons[log.action] || Shield;
        const TargetIcon = targetTypeIcons[log.targetType] || FileText;

        const initials =
          log.moderator.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

        return (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 bg-background-muted rounded-lg"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage
                src={log.moderator.image || undefined}
                alt={log.moderator.name || ""}
              />
              <AvatarFallback className="text-xs bg-background-muted">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {log.moderator.name || "Anonymous"}
                </span>
                <span className="text-foreground-muted">
                  {actionLabels[log.action] || log.action.toLowerCase()}
                </span>
              </div>

              {log.targetTitle && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-foreground-muted">
                  <TargetIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{log.targetTitle}</span>
                </div>
              )}

              <div className="text-xs text-foreground-muted mt-1">{timeAgo}</div>
            </div>

            <div className="shrink-0">
              <ActionIcon className="h-4 w-4 text-foreground-muted" />
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-background-muted rounded-lg animate-pulse"
            >
              <div className="h-8 w-8 rounded-full bg-background-muted" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-background-muted rounded mb-2" />
                <div className="h-3 w-48 bg-background-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !isLoading && (
        <button
          onClick={loadMore}
          className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-subtle rounded-lg transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
