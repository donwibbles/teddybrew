import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getPosts } from "@/lib/db/posts";
import { PostList } from "@/components/forum/post-list";
import { ForumSortTabs } from "@/components/forum/forum-sort-tabs";

interface PublicForumPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: PublicForumPageProps) {
  const { slug } = await params;
  const community = await getCommunityWithDetails(slug);

  if (!community) {
    return { title: "Community Not Found" };
  }

  return {
    title: `Forum - ${community.name} - Hive Community`,
    description: `Discuss and share with members of ${community.name}`,
  };
}

export default async function PublicForumPage({ params, searchParams }: PublicForumPageProps) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;
  const session = await auth();

  // Redirect authenticated users to the full experience
  if (session?.user) {
    redirect(`/communities/${slug}/forum`);
  }

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  // Private community - show restricted message
  if (community.type === "PRIVATE") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background-muted text-foreground-muted mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Private Community
          </h1>
          <p className="text-foreground-muted mb-6">
            This community&apos;s forum is private. Sign in to request access or view if you&apos;re already a member.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-subtle0 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors"
          >
            Sign In to View
          </Link>
        </div>
      </div>
    );
  }

  const sort = (sortParam === "new" || sortParam === "top" ? sortParam : "hot") as "hot" | "new" | "top";

  const { posts, nextCursor, hasMore } = await getPosts(
    community.id,
    sort,
    20,
    undefined,
    undefined // no userId for public view
  );

  return (
    <div className="space-y-4">
      {/* Sign in banner */}
      <div className="bg-primary-subtle border border-primary-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-primary-900">
              Want to participate in {community.name}&apos;s forum?
            </p>
            <p className="text-sm text-primary-700 mt-1">
              Sign in to create posts, vote, and comment.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-subtle0 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors whitespace-nowrap"
          >
            Sign in to Join
          </Link>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Link
          href={`/explore/${slug}`}
          className="hover:text-primary-600"
        >
          {community.name}
        </Link>
        <span>/</span>
        <span>Forum</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">
          Forum
        </h1>
      </div>

      {/* Sort Tabs */}
      <ForumSortTabs
        currentSort={sort}
        basePath={`/explore/${slug}/forum`}
      />

      {/* Post List */}
      <PostList
        communityId={community.id}
        communitySlug={community.slug}
        sort={sort}
        initialPosts={posts}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
        basePath="/explore"
        disabled
      />
    </div>
  );
}
