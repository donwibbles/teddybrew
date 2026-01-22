import { Suspense } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { verifySession } from "@/lib/dal";
import {
  getUserOrganizedEvents,
  getUserAttendingEvents,
  getUserPastEvents,
} from "@/lib/db/events";
import { EventCard } from "@/components/event/event-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "My Events - Hive Community",
  description: "View events you're attending or organizing",
};

async function MyEventsList() {
  const { userId } = await verifySession();

  const [organizing, attending, past] = await Promise.all([
    getUserOrganizedEvents(userId),
    getUserAttendingEvents(userId),
    getUserPastEvents(userId),
  ]);

  // Filter out events from attending that user is also organizing (to avoid duplicates)
  const organizingIds = new Set(organizing.map((e) => e.id));
  const attendingOnly = attending.filter((e) => !organizingIds.has(e.id));

  const hasUpcoming = organizing.length > 0 || attendingOnly.length > 0;

  return (
    <div className="space-y-10">
      {/* Organizing Section */}
      {organizing.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Events You&apos;re Organizing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizing.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={userId}
                showCommunity={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* Attending Section */}
      {attendingOnly.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Events You&apos;re Attending
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendingOnly.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={userId}
                showCommunity={true}
              />
            ))}
          </div>
        </section>
      )}

      {/* No Upcoming Events */}
      {!hasUpcoming && (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          description="You haven't RSVP'd to any upcoming events yet."
          action={
            <Link
              href="/events"
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Browse Events
            </Link>
          }
        />
      )}

      {/* Past Events Section */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Past Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={userId}
                showCommunity={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function MyEventsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">My Events</h1>
          <p className="text-neutral-600 mt-1">
            Events you&apos;re organizing or attending
          </p>
        </div>
        <Link
          href="/events"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Browse all events
        </Link>
      </div>

      {/* Events */}
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
        <MyEventsList />
      </Suspense>
    </div>
  );
}
