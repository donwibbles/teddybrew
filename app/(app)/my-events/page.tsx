import { Suspense } from "react";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import {
  getUserOrganizedEvents,
  getUserAttendingEvents,
  getUserPastEvents,
} from "@/lib/db/events";
import { EventCard } from "@/components/event/event-card";

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
            No upcoming events
          </h3>
          <p className="text-neutral-600 mb-4">
            You haven&apos;t RSVP&apos;d to any upcoming events yet.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Browse Events
          </Link>
        </div>
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
