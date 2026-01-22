import { Suspense } from "react";
import { searchEvents } from "@/lib/actions/event";
import { getPublicCommunities } from "@/lib/db/communities";
import { EventCard } from "@/components/event/event-card";
import { EventFilters } from "@/components/event/event-filters";
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
  }>;
}

async function EventsList({
  searchParams,
}: {
  searchParams: EventsPageProps["searchParams"];
}) {
  const params = await searchParams;
  const showPast = params.showPast === "true";

  // Get current user for RSVP status display
  let currentUserId: string | undefined;
  try {
    const session = await verifySession();
    currentUserId = session.userId;
  } catch {
    // User not logged in
  }

  const events = await searchEvents(params.q, params.community, showPast);

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-neutral-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-1">
          No events found
        </h3>
        <p className="text-neutral-600">
          {showPast
            ? "No past events match your criteria."
            : "No upcoming events match your criteria."}
        </p>
      </div>
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
