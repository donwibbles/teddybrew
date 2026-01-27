import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPublicPosts } from "@/lib/db/posts";
import { ForumSortTabs } from "@/components/forum/forum-sort-tabs";
import { GlobalPostList, GlobalPostListSkeleton } from "@/components/forum/global-post-list";

export const metadata = {
  title: "Forum - Hive Community",
  description: "Discover discussions from communities across Hive",
};

interface ExploreForumPageProps {
  searchParams: Promise<{ sort?: string }>;
}

async function ForumPostsList({ sort }: { sort: "hot" | "new" | "top" }) {
  const { posts, nextCursor, hasMore } = await getPublicPosts(
    sort,
    20,
    undefined,
    undefined
  );

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

export default async function ExploreForumPage({ searchParams }: ExploreForumPageProps) {
  const session = await auth();

  // Redirect authenticated users to the full experience
  if (session?.user) {
    redirect("/forum");
  }

  const { sort: sortParam } = await searchParams;
  const sort = (sortParam === "new" || sortParam === "top" ? sortParam : "hot") as "hot" | "new" | "top";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Sign in banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
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
        <h1 className="text-2xl font-semibold text-neutral-900">Forum</h1>
        <p className="text-neutral-600 mt-1">
          Discover discussions from communities across Hive
        </p>
      </div>

      {/* Sort Tabs */}
      <ForumSortTabs currentSort={sort} basePath="/explore/forum" />

      {/* Post List */}
      <Suspense fallback={<GlobalPostListSkeleton count={5} />}>
        <ForumPostsList sort={sort} />
      </Suspense>
    </div>
  );
}
