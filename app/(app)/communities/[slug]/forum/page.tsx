import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCommunityWithDetails } from "@/lib/db/communities";
import { getMembershipStatus } from "@/lib/actions/membership";
import { getPosts } from "@/lib/db/posts";
import { getCurrentUserId } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { PostList } from "@/components/forum/post-list";
import { ForumSortTabs } from "@/components/forum/forum-sort-tabs";

interface ForumPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: ForumPageProps) {
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

export default async function ForumPage({ params, searchParams }: ForumPageProps) {
  const { slug } = await params;
  const { sort: sortParam } = await searchParams;

  const community = await getCommunityWithDetails(slug);

  if (!community) {
    notFound();
  }

  const membership = await getMembershipStatus(community.id);

  // Private community - non-members cannot view forum
  if (community.type === "PRIVATE" && !membership.isMember) {
    redirect(`/communities/${slug}`);
  }

  const userId = await getCurrentUserId();
  const sort = (sortParam === "new" || sortParam === "top" ? sortParam : "hot") as "hot" | "new" | "top";

  const { posts, nextCursor, hasMore } = await getPosts(
    community.id,
    sort,
    20,
    undefined,
    userId || undefined
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link
          href={`/communities/${slug}`}
          className="hover:text-primary-600"
        >
          {community.name}
        </Link>
        <span>/</span>
        <span>Forum</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-semibold text-neutral-900">
          Forum
        </h1>
        {membership.isMember && (
          <Link href={`/communities/${slug}/forum/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        )}
      </div>

      {/* Sort Tabs */}
      <ForumSortTabs
        currentSort={sort}
        basePath={`/communities/${slug}/forum`}
      />

      {/* Post List */}
      <PostList
        communityId={community.id}
        communitySlug={community.slug}
        sort={sort}
        initialPosts={posts}
        initialCursor={nextCursor}
        initialHasMore={hasMore}
      />
    </div>
  );
}
