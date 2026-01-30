import { Suspense } from "react";
import { getPublicPosts } from "@/lib/db/posts";
import { getIssueTags } from "@/lib/actions/community";
import { getCurrentUserId } from "@/lib/dal";
import { ForumSortTabs } from "@/components/forum/forum-sort-tabs";
import { FeedFilters } from "@/components/feed/feed-filters";
import { GlobalPostList, GlobalPostListSkeleton } from "@/components/forum/global-post-list";

export const metadata = {
  title: "Feed - Hive Community",
  description: "Discover discussions from communities across Hive",
};

interface FeedPageProps {
  searchParams: Promise<{ sort?: string; type?: string; tags?: string }>;
}

async function FeedPostsList({
  sort,
  postType,
  tagSlugs,
}: {
  sort: "hot" | "new" | "top";
  postType?: string;
  tagSlugs?: string[];
}) {
  const userId = await getCurrentUserId();

  const { posts, nextCursor, hasMore } = await getPublicPosts({
    sort,
    limit: 20,
    userId: userId || undefined,
    postType: postType || undefined,
    issueTagSlugs: tagSlugs?.length ? tagSlugs : undefined,
  });

  return (
    <GlobalPostList
      sort={sort}
      initialPosts={posts}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
    />
  );
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const sort = (params.sort === "new" || params.sort === "top" ? params.sort : "hot") as "hot" | "new" | "top";
  const postType = params.type || "";
  const tagSlugs = params.tags?.split(",").filter(Boolean) || [];

  const availableTags = await getIssueTags();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Feed</h1>
        <p className="text-neutral-600 mt-1">
          Discover discussions from communities across Hive
        </p>
      </div>

      {/* Sort Tabs */}
      <ForumSortTabs currentSort={sort} basePath="/feed" />

      {/* Filters */}
      <FeedFilters availableTags={availableTags} basePath="/feed" />

      {/* Post List */}
      <Suspense fallback={<GlobalPostListSkeleton count={5} />}>
        <FeedPostsList sort={sort} postType={postType} tagSlugs={tagSlugs} />
      </Suspense>
    </div>
  );
}
