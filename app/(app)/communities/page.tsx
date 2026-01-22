import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/db/users";
import { searchCommunities } from "@/lib/actions/community";
import { getBatchMembershipStatus } from "@/lib/actions/membership";
import { CommunityCard } from "@/components/community/community-card";
import { CommunitySearch } from "@/components/community/community-search";

export const metadata = {
  title: "Communities - Hive Community",
  description: "Discover and join communities",
};

interface CommunitiesPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
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
  const typeFilter = params.type || "ALL";

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

      {/* Search and Filter */}
      <CommunitySearch initialQuery={query} initialType={typeFilter} />

      {/* Community List */}
      <Suspense fallback={<CommunityListSkeleton />}>
        <CommunityList query={query} typeFilter={typeFilter} />
      </Suspense>
    </div>
  );
}

async function CommunityList({
  query,
  typeFilter,
}: {
  query: string;
  typeFilter: string;
}) {
  const communities = await searchCommunities(query, typeFilter);

  if (communities.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
        <svg
          className="w-12 h-12 mx-auto text-neutral-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-neutral-900 mb-1">
          No communities found
        </h3>
        <p className="text-neutral-500 mb-4">
          {query
            ? "Try adjusting your search or filters"
            : "Be the first to create a community!"}
        </p>
        {!query && (
          <Link
            href="/communities/new"
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Create Community
          </Link>
        )}
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
