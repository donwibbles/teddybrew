import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";
import { searchCommunities } from "@/lib/actions/community";
import { getBatchMembershipStatus } from "@/lib/actions/membership";
import { CommunityCard } from "@/components/community/community-card";
import { CommunitySearch } from "@/components/community/community-search";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Communities - Hive Community",
  description: "Discover and join communities",
};

interface CommunitiesPageProps {
  searchParams: Promise<{ q?: string; size?: string; sort?: string; state?: string; virtual?: string }>;
}

export default async function CommunitiesPage({
  searchParams,
}: CommunitiesPageProps) {
  // Check if user needs to complete onboarding
  const session = await auth();
  if (session?.user?.id) {
    const user = await getUserById(session.user.id);
    if (user && !user.name && !user.username) {
      // New user - redirect to profile for onboarding
      redirect("/profile");
    }
  }

  const params = await searchParams;
  const query = params.q || "";
  const sizeFilter = params.size || "all";
  const sortBy = params.sort || "recent";
  const stateFilter = params.state || "";
  const virtualOnly = params.virtual === "true";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Communities
          </h1>
          <p className="text-neutral-600 mt-1">
            Discover communities and connect with others
          </p>
        </div>
        <Link
          href="/communities/new"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg
                     hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                     transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Community
        </Link>
      </div>

      {/* Search and Filters */}
      <CommunitySearch
        initialQuery={query}
        initialSize={sizeFilter}
        initialSort={sortBy}
        initialState={stateFilter}
        initialVirtual={virtualOnly}
      />

      {/* Community List */}
      <Suspense fallback={<CommunityListSkeleton />}>
        <CommunityList
          query={query}
          sizeFilter={sizeFilter}
          sortBy={sortBy}
          stateFilter={stateFilter}
          virtualOnly={virtualOnly}
        />
      </Suspense>
    </div>
  );
}

async function CommunityList({
  query,
  sizeFilter,
  sortBy,
  stateFilter,
  virtualOnly,
}: {
  query: string;
  sizeFilter: string;
  sortBy: string;
  stateFilter: string;
  virtualOnly: boolean;
}) {
  const communities = await searchCommunities({
    query,
    sizeFilter: sizeFilter as "all" | "small" | "medium" | "large",
    sortBy: sortBy as "recent" | "popular",
    state: stateFilter || undefined,
    isVirtual: virtualOnly || undefined,
  });

  if (communities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200">
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
                href="/communities/new"
                className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
              >
                Create Community
              </Link>
            ) : undefined
          }
        />
      </div>
    );
  }

  // Batch fetch membership status for all communities (prevents N+1 queries)
  const communityIds = communities.map((c) => c.id);
  const membershipsMap = await getBatchMembershipStatus(communityIds);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {communities.map((community) => (
        <CommunityCard
          key={community.id}
          community={community}
          membership={membershipsMap[community.id]}
        />
      ))}
    </div>
  );
}

function CommunityListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-neutral-200 p-6 animate-pulse"
        >
          <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-neutral-200 rounded w-full mb-4" />
          <div className="h-4 bg-neutral-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
