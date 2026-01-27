"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2, FileText } from "lucide-react";
import { PostCard, PostCardSkeleton } from "./post-card";
import { getPosts } from "@/lib/actions/post";
import { EmptyState } from "@/components/ui/empty-state";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: Author;
  createdAt: Date | string;
  voteScore: number;
  userVote: number;
  commentCount: number;
  isPinned: boolean;
}

interface PostListProps {
  communityId: string;
  communitySlug: string;
  sort: "hot" | "new" | "top";
  initialPosts: Post[];
  initialCursor?: string;
  initialHasMore: boolean;
  basePath?: string;
  disabled?: boolean;
}

export function PostList({
  communityId,
  communitySlug,
  sort,
  initialPosts,
  initialCursor,
  initialHasMore,
  basePath = "/communities",
  disabled = false,
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Reset when sort changes
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
    setHasMore(initialHasMore);
  }, [sort, initialPosts, initialCursor, initialHasMore]);

  // Infinite scroll trigger
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  });

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    const result = await getPosts({
      communityId,
      sort,
      cursor,
      limit: 20,
    });

    setPosts((prev) => [...prev, ...result.posts]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, [communityId, sort, cursor, hasMore, isLoading]);

  // Load more when scroll trigger is in view
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      loadMore();
    }
  }, [inView, hasMore, isLoading, loadMore]);

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200">
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Be the first to post!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          {...post}
          communitySlug={communitySlug}
          basePath={basePath}
          disabled={disabled}
        />
      ))}

      {/* Loading indicator / scroll trigger */}
      <div ref={ref} className="py-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more posts...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-sm text-neutral-400">
            No more posts to load
          </p>
        )}
      </div>
    </div>
  );
}

export function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
