"use client";

import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
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
      className="block bg-white rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span className="font-medium text-primary-600">{item.community.name}</span>
            <span>·</span>
            <span>New event</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          <h3 className="font-medium text-neutral-900 line-clamp-1">{data.title}</h3>

          {data.description && (
            <p className="text-sm text-neutral-600 line-clamp-2 mt-1">{data.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
            {data.nextSessionDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(data.nextSessionDate, "MMM d, h:mm a")}
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
      className="block bg-white rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-neutral-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <span className="font-medium text-primary-600">{item.community.name}</span>
            <span>·</span>
            <span>New post by {data.authorName || "Anonymous"}</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>

          <h3 className="font-medium text-neutral-900 line-clamp-1">{data.title}</h3>

          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
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
    <div className="bg-white rounded-lg border border-neutral-200 p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-200" />
        <div className="flex-1">
          <div className="h-3 w-48 bg-neutral-100 rounded mb-2" />
          <div className="h-5 w-3/4 bg-neutral-200 rounded mb-2" />
          <div className="h-3 w-32 bg-neutral-100 rounded" />
        </div>
      </div>
    </div>
  );
}
