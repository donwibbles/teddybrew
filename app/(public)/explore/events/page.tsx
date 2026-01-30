import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { auth } from "@/lib/auth";
import { searchEvents } from "@/lib/actions/event";
import { getIssueTags } from "@/lib/actions/community";
import { getPublicCommunities } from "@/lib/db/communities";
import { EventCard } from "@/components/event/event-card";
import { EventFilters } from "@/components/event/event-filters";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Events - Hive Community",
  description: "Discover upcoming events in public communities",
};

interface ExploreEventsPageProps {
  searchParams: Promise<{
    q?: string;
    community?: string;
    showPast?: string;
    state?: string;
    virtual?: string;
    type?: string;
    tags?: string;
  }>;
}

async function EventsList({
  searchParams,
}: {
  searchParams: ExploreEventsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const showPast = params.showPast === "true";
  const virtualOnly = params.virtual === "true";
  const tagSlugs = params.tags?.split(",").filter(Boolean) || [];

  const events = await searchEvents({
    query: params.q,
    communityId: params.community,
    showPast,
    state: params.state || undefined,
    isVirtual: virtualOnly || undefined,
    eventType: params.type || undefined,
    issueTagSlugs: tagSlugs.length > 0 ? tagSlugs : undefined,
  });

  if (events.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No events found"
        description={
          showPast
            ? "No past events match your criteria."
            : "No upcoming events match your criteria."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          showCommunity={true}
          basePath="/explore"
        />
      ))}
    </div>
  );
}

export default async function ExploreEventsPage({ searchParams }: ExploreEventsPageProps) {
  const session = await auth();

  // Redirect authenticated users to the full experience
  if (session?.user) {
    redirect("/events");
  }

  const [communities, availableTags] = await Promise.all([
    getPublicCommunities(),
    getIssueTags(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Sign in banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-primary-900">
              Want to attend events?
            </p>
            <p className="text-sm text-primary-700 mt-1">
              Sign in to RSVP, join communities, and connect with others.
            </p>
          </div>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                       hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                       transition-colors whitespace-nowrap"
          >
            Sign in to RSVP
          </Link>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Events</h1>
        <p className="text-neutral-600 mt-1">
          Discover upcoming events in public communities
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-12 bg-neutral-100 rounded animate-pulse" />}>
        <EventFilters communities={communities} availableTags={availableTags} basePath="/explore/events" />
      </Suspense>

      {/* Events List */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-48 bg-neutral-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        }
      >
        <EventsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
