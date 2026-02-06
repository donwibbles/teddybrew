"use client";

import { useState, useEffect, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2, FileText } from "lucide-react";
import { PostCard, PostCardSkeleton } from "./post-card";
import { getPublicPostsAction } from "@/lib/actions/post";
import { EmptyState } from "@/components/ui/empty-state";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Community {
  id: string;
  slug: string;
  name: string;
}

interface Post {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: Author;
  community: Community;
  createdAt: Date | string;
  voteScore: number;
  userVote: number;
  commentCount: number;
  isPinned: boolean;
  postType?: string | null;
  issueTags?: Array<{ slug: string; name: string }>;
}

interface GlobalPostListProps {
  sort: "hot" | "new" | "top";
  initialPosts: Post[];
  initialCursor?: string;
  initialHasMore: boolean;
  basePath?: string;
  disabled?: boolean;
}

export function GlobalPostList({
  sort,
  initialPosts,
  initialCursor,
  initialHasMore,
  basePath = "/communities",
  disabled = false,
}: GlobalPostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  // Reset when sort changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync state with props on sort change
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
    const result = await getPublicPostsAction({
      sort,
      cursor,
      limit: 20,
    });

    setPosts((prev) => [...prev, ...result.posts]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoading(false);
  }, [sort, cursor, hasMore, isLoading]);

  // Load more when scroll trigger is in view
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Infinite scroll trigger
      loadMore();
    }
  }, [inView, hasMore, isLoading, loadMore]);

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Be the first to post in a community!"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          id={post.id}
          slug={post.slug}
          title={post.title}
          content={post.content}
          author={post.author}
          createdAt={post.createdAt}
          voteScore={post.voteScore}
          userVote={post.userVote}
          commentCount={post.commentCount}
          isPinned={post.isPinned}
          communitySlug={post.community.slug}
          issueTags={post.issueTags}
          showCommunity={true}
          community={post.community}
          basePath={basePath}
          disabled={disabled}
        />
      ))}

      {/* Loading indicator / scroll trigger */}
      <div ref={ref} className="py-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-foreground-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more posts...</span>
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-sm text-foreground-muted">
            No more posts to load
          </p>
        )}
      </div>
    </div>
  );
}

export function GlobalPostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
