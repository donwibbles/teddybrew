import { Suspense } from "react";
import { Calendar } from "lucide-react";
import { searchEvents } from "@/lib/actions/event";
import { getPublicCommunities } from "@/lib/db/communities";
import { EventCard } from "@/components/event/event-card";
import { EventFilters } from "@/components/event/event-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { verifySession } from "@/lib/dal";

export const metadata = {
  title: "Events - Hive Community",
  description: "Discover upcoming events in your communities",
};

interface EventsPageProps {
  searchParams: Promise<{
    q?: string;
    community?: string;
    showPast?: string;
    state?: string;
    virtual?: string;
    type?: string;
  }>;
}

async function EventsList({
  searchParams,
}: {
  searchParams: EventsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const showPast = params.showPast === "true";
  const virtualOnly = params.virtual === "true";

  // Get current user for RSVP status display
  let currentUserId: string | undefined;
  try {
    const session = await verifySession();
    currentUserId = session.userId;
  } catch {
    // User not logged in
  }

  const events = await searchEvents({
    query: params.q,
    communityId: params.community,
    showPast,
    state: params.state || undefined,
    isVirtual: virtualOnly || undefined,
    eventType: params.type || undefined,
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
          currentUserId={currentUserId}
          showCommunity={true}
        />
      ))}
    </div>
  );
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const communities = await getPublicCommunities();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Events</h1>
        <p className="text-neutral-600 mt-1">
          Discover upcoming events in your communities
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-12 bg-neutral-100 rounded animate-pulse" />}>
        <EventFilters communities={communities} />
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
