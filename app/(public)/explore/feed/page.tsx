import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPublicPosts } from "@/lib/db/posts";
import { getIssueTags } from "@/lib/actions/community";
import { ForumSortTabs } from "@/components/forum/forum-sort-tabs";
import { FeedFilters } from "@/components/feed/feed-filters";
import { GlobalPostList, GlobalPostListSkeleton } from "@/components/forum/global-post-list";

export const metadata = {
  title: "Feed - Hive Community",
  description: "Discover discussions from communities across Hive",
};

interface ExploreFeedPageProps {
  searchParams: Promise<{ sort?: string; tags?: string }>;
}

async function FeedPostsList({
  sort,
  tagSlugs,
}: {
  sort: "hot" | "new" | "top";
  tagSlugs?: string[];
}) {
  const { posts, nextCursor, hasMore } = await getPublicPosts({
    sort,
    limit: 20,
    issueTagSlugs: tagSlugs?.length ? tagSlugs : undefined,
  });

  return (
    <GlobalPostList
      sort={sort}
      initialPosts={posts}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
      basePath="/explore"
      disabled={true}
    />
  );
}

export default async function ExploreFeedPage({ searchParams }: ExploreFeedPageProps) {
  const session = await auth();

  // Redirect authenticated users to the full experience
  if (session?.user) {
    redirect("/feed");
  }

  const params = await searchParams;
  const sort = (params.sort === "new" || params.sort === "top" ? params.sort : "hot") as "hot" | "new" | "top";
  const tagSlugs = params.tags?.split(",").filter(Boolean) || [];

  const availableTags = await getIssueTags();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Sign in banner */}
      <div className="bg-primary-subtle border border-primary-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-primary-900">
              Want to participate in discussions?
            </p>
            <p className="text-sm text-primary-700 mt-1">
              Sign in to create posts, vote, and comment.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors whitespace-nowrap"
          >
            Sign in to Join
          </Link>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Feed</h1>
        <p className="text-foreground-muted mt-1">
          Discover discussions from communities across Hive
        </p>
      </div>

      {/* Sort Tabs */}
      <ForumSortTabs currentSort={sort} basePath="/explore/feed" />

      {/* Filters */}
      <FeedFilters availableTags={availableTags} basePath="/explore/feed" />

      {/* Post List */}
      <Suspense fallback={<GlobalPostListSkeleton count={5} />}>
        <FeedPostsList sort={sort} tagSlugs={tagSlugs} />
      </Suspense>
    </div>
  );
}
