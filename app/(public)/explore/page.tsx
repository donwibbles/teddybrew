import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { searchCommunities } from "@/lib/actions/community";
import { EmptyState } from "@/components/ui/empty-state";
import { PublicCommunitySearch } from "@/components/community/public-community-search";

export const metadata = {
  title: "Explore Communities - Hive Community",
  description: "Discover public communities on Hive Community",
};

interface ExplorePageProps {
  searchParams: Promise<{ q?: string; size?: string; sort?: string }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const session = await auth();

  // Redirect authenticated users to the full communities experience
  if (session?.user) {
    const params = await searchParams;
    const queryString = new URLSearchParams();
    if (params.q) queryString.set("q", params.q);
    if (params.size) queryString.set("size", params.size);
    if (params.sort) queryString.set("sort", params.sort);
    const suffix = queryString.toString() ? `?${queryString.toString()}` : "";
    redirect(`/communities${suffix}`);
  }

  const params = await searchParams;
  const query = params.q || "";
  const sizeFilter = params.size || "all";
  const sortBy = params.sort || "recent";

  return (
    <div className="space-y-6">
      {/* Sign in prompt banner */}
      <div className="bg-primary-subtle border border-primary-200 rounded-lg p-4">
        <div>
          <p className="font-medium text-primary-900">
            Join Hive to stay connected!
          </p>
          <p className="text-sm text-primary-700 mt-1">
            Sign in to meet others, build community, and take collective action.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Explore Communities
        </h1>
        <p className="text-foreground-muted mt-1">
          Discover public communities and connect with others
        </p>
      </div>

      {/* Search and Filters */}
      <PublicCommunitySearch
        initialQuery={query}
        initialSize={sizeFilter}
        initialSort={sortBy}
      />

      {/* Community List */}
      <Suspense fallback={<CommunityListSkeleton />}>
        <PublicCommunityList query={query} sizeFilter={sizeFilter} sortBy={sortBy} />
      </Suspense>
    </div>
  );
}

async function PublicCommunityList({
  query,
  sizeFilter,
  sortBy,
}: {
  query: string;
  sizeFilter: string;
  sortBy: string;
}) {
  const communities = await searchCommunities({
    query,
    sizeFilter: sizeFilter as "all" | "small" | "medium" | "large",
    sortBy: sortBy as "recent" | "popular",
  });

  if (communities.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <EmptyState
          icon={Users}
          title="No communities found"
          description={
            query
              ? "Try adjusting your search or filters"
              : "Be the first to create a community!"
          }
          action={
            !query ? (
              <Link
                href="/sign-in"
                className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                Sign in to Create
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => (
        <PublicCommunityCard key={community.id} community={community} />
      ))}
    </div>
  );
}

function PublicCommunityCard({
  community,
}: {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    owner: {
      id: string;
      name: string | null;
      image: string | null;
    };
    _count: {
      members: number;
      events: number;
    };
  };
}) {
  return (
    <Link
      href={`/explore/${community.slug}`}
      className="block bg-card rounded-lg border border-border p-6 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-foreground line-clamp-1">
          {community.name}
        </h3>
      </div>

      {community.description && (
        <p className="text-foreground-muted text-sm mb-4 line-clamp-2">
          {community.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-foreground-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {community._count.members}{" "}
            {community._count.members === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {community._count.events}{" "}
            {community._count.events === 1 ? "event" : "events"}
          </span>
        </div>
        <span className="text-foreground-muted">
          by {community.owner.name || "Unknown"}
        </span>
      </div>
    </Link>
  );
}

function CommunityListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg border border-border p-6 animate-pulse"
        >
          <div className="h-6 bg-background-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-background-muted rounded w-full mb-4" />
          <div className="h-4 bg-background-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
