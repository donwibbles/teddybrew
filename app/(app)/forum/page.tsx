import { Suspense } from "react";
import { getPublicPosts } from "@/lib/db/posts";
import { getCurrentUserId } from "@/lib/dal";
import { ForumSortTabs } from "@/components/forum/forum-sort-tabs";
import { GlobalPostList, GlobalPostListSkeleton } from "@/components/forum/global-post-list";

export const metadata = {
  title: "Forum - Hive Community",
  description: "Discover discussions from communities across Hive",
};

interface ForumPageProps {
  searchParams: Promise<{ sort?: string }>;
}

async function ForumPostsList({ sort }: { sort: "hot" | "new" | "top" }) {
  const userId = await getCurrentUserId();

  const { posts, nextCursor, hasMore } = await getPublicPosts(
    sort,
    20,
    undefined,
    userId || undefined
  );

  return (
    <GlobalPostList
      sort={sort}
      initialPosts={posts}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
    />
  );
}

export default async function ForumPage({ searchParams }: ForumPageProps) {
  const { sort: sortParam } = await searchParams;
  const sort = (sortParam === "new" || sortParam === "top" ? sortParam : "hot") as "hot" | "new" | "top";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Forum</h1>
        <p className="text-neutral-600 mt-1">
          Discover discussions from communities across Hive
        </p>
      </div>

      {/* Sort Tabs */}
      <ForumSortTabs currentSort={sort} basePath="/forum" />

      {/* Post List */}
      <Suspense fallback={<GlobalPostListSkeleton count={5} />}>
        <ForumPostsList sort={sort} />
      </Suspense>
    </div>
  );
}
