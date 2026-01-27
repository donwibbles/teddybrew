"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2, Activity } from "lucide-react";
import { ActivityItemCard, ActivityItemSkeleton } from "./activity-item";
import { getMoreActivity } from "@/lib/actions/activity";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityItem } from "@/lib/db/activity";

interface ActivityFeedProps {
  initialItems: ActivityItem[];
  initialCursor?: Date;
  initialHasMore: boolean;
}

export function ActivityFeed({
  initialItems,
  initialCursor,
  initialHasMore,
}: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>(initialItems);
  const [cursor, setCursor] = useState<Date | undefined>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Infinite scroll trigger
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  });

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const result = await getMoreActivity(cursor?.toISOString());

    setItems((prev) => [...prev, ...result.items]);
    setCursor(result.nextCursor ? new Date(result.nextCursor) : undefined);
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, [cursor, hasMore, isLoading]);

  // Load more when scroll trigger is in view
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, hasMore, isLoading, loadMore]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200">
        <EmptyState
          icon={Activity}
          title="No recent activity"
          description="Activity from your communities will appear here"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ActivityItemCard key={`${item.type}-${item.id}`} item={item} />
      ))}

      {/* Loading indicator / scroll trigger */}
      <div ref={ref} className="py-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more activity...</span>
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-center text-sm text-neutral-400">
            No more activity to load
          </p>
        )}
      </div>
    </div>
  );
}

export function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityItemSkeleton key={i} />
      ))}
    </div>
  );
}
