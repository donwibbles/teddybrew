"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { formatEventTime } from "@/lib/utils/timezone";
import { Calendar, MessageSquare, Users, ArrowUp } from "lucide-react";
import type { ActivityItem, EventActivityData, PostActivityData } from "@/lib/db/activity";

interface ActivityItemProps {
  item: ActivityItem;
}

export function ActivityItemCard({ item }: ActivityItemProps) {
  const timeAgo = formatDistanceToNow(item.createdAt, { addSuffix: true });

  if (item.type === "event") {
    return <EventActivityItem item={item} data={item.data as EventActivityData} timeAgo={timeAgo} />;
  }

  return <PostActivityItem item={item} data={item.data as PostActivityData} timeAgo={timeAgo} />;
}

function EventActivityItem({
  item,
  data,
  timeAgo,
}: {
  item: ActivityItem;
  data: EventActivityData;
  timeAgo: string;
}) {
  return (
    <Link
      href={`/communities/${item.community.slug}/events/${data.id}`}
      className="block bg-card rounded-lg border border-border p-4 hover:border-border transition-colors hover:bg-background-hover"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-subtle flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
            <span className="font-medium text-primary-600">{item.community.name}</span>
            <span>·</span>
            <span>New event</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          <h3 className="font-medium text-foreground line-clamp-1">{data.title}</h3>

          {data.description && (
            <p className="text-sm text-foreground-muted line-clamp-2 mt-1">{data.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-foreground-muted">
            {data.nextSessionDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatEventTime(
                  new Date(data.nextSessionDate),
                  data.timezone || "America/New_York",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {data.rsvpCount} attending
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostActivityItem({
  item,
  data,
  timeAgo,
}: {
  item: ActivityItem;
  data: PostActivityData;
  timeAgo: string;
}) {
  return (
    <Link
      href={`/communities/${item.community.slug}/forum/${data.id}`}
      className="block bg-card rounded-lg border border-border p-4 hover:border-border transition-colors hover:bg-background-hover"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-background-muted flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-foreground-muted" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1">
            <span className="font-medium text-primary-600">{item.community.name}</span>
            <span>·</span>
            <span>New post by {data.authorName || "Anonymous"}</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          <h3 className="font-medium text-foreground line-clamp-1">{data.title}</h3>

          <div className="flex items-center gap-4 mt-2 text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3.5 w-3.5" />
              {data.voteScore}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {data.commentCount} {data.commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ActivityItemSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-background-muted" />
        <div className="flex-1">
          <div className="h-3 w-48 bg-background-muted rounded mb-2" />
          <div className="h-5 w-3/4 bg-background-muted rounded mb-2" />
          <div className="h-3 w-32 bg-background-muted rounded" />
        </div>
      </div>
    </div>
  );
}
