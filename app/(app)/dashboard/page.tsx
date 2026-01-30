import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Users } from "lucide-react";
import { verifySession } from "@/lib/dal";
import {
  getUserOrganizedEvents,
  getUserAttendingEvents,
} from "@/lib/db/events";
import { getUserCommunityActivity, getUserCommunities } from "@/lib/db/activity";
import { EventCard } from "@/components/event/event-card";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/activity/activity-feed";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = {
  title: "Dashboard - Hive Community",
  description: "Your communities, events, and activity feed",
};

async function MyEventsList() {
  const { userId } = await verifySession();

  const [organizing, attending] = await Promise.all([
    getUserOrganizedEvents(userId),
    getUserAttendingEvents(userId),
  ]);

  // Filter out events from attending that user is also organizing
  const organizingIds = new Set(organizing.map((e) => e.id));
  const attendingOnly = attending.filter((e) => !organizingIds.has(e.id));

  const hasEvents = organizing.length > 0 || attendingOnly.length > 0;

  if (!hasEvents) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Organizing Section */}
      {organizing.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">
            Organizing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizing.slice(0, 4).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={userId}
                showCommunity={true}
              />
            ))}
          </div>
          {organizing.length > 4 && (
            <Link
              href="/events?organizing=true"
              className="block mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all {organizing.length} events you&apos;re organizing
            </Link>
          )}
        </div>
      )}

      {/* Attending Section */}
      {attendingOnly.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">
            Attending
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attendingOnly.slice(0, 4).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentUserId={userId}
                showCommunity={true}
              />
            ))}
          </div>
          {attendingOnly.length > 4 && (
            <Link
              href="/events?attending=true"
              className="block mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all {attendingOnly.length} events you&apos;re attending
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

async function CommunityActivityFeed() {
  const { userId } = await verifySession();

  const { items, nextCursor, hasMore } = await getUserCommunityActivity(userId, 20);

  return (
    <ActivityFeed
      initialItems={items}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
    />
  );
}

async function CommunitiesSidebar() {
  const { userId } = await verifySession();
  const communities = await getUserCommunities(userId);

  if (communities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <p className="text-sm text-neutral-600 mb-3">
          You haven&apos;t joined any communities yet.
        </p>
        <Link
          href="/communities"
          className="inline-flex items-center px-3 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          Browse Communities
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
      <div className="p-3 border-b border-neutral-200 bg-neutral-50">
        <h3 className="font-medium text-neutral-900 text-sm">Your Communities</h3>
      </div>
      <div className="divide-y divide-neutral-100">
        {communities.slice(0, 8).map((community) => (
          <Link
            key={community.id}
            href={`/communities/${community.slug}`}
            className="flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors"
          >
            {community.logoUrl ? (
              <Image
                src={community.logoUrl}
                alt={community.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-900 text-sm truncate">
                {community.name}
              </p>
              <p className="text-xs text-neutral-500">
                {community.memberCount} members
              </p>
            </div>
          </Link>
        ))}
      </div>
      {communities.length > 8 && (
        <Link
          href="/communities"
          className="block p-3 text-center text-sm text-primary-600 hover:bg-neutral-50 border-t border-neutral-200"
        >
          View all communities
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-600 mt-1">
          Your events and activity from communities you&apos;ve joined
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Your Events Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Your Events</h2>
              <Link
                href="/events"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Browse all events
              </Link>
            </div>
            <Suspense
              fallback={
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
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
          </section>

          {/* Activity Feed Section */}
          <section>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Recent Activity
            </h2>
            <p className="text-sm text-neutral-500 mb-4">
              New events and posts from your communities in the last 7 days
            </p>
            <Suspense fallback={<ActivityFeedSkeleton count={5} />}>
              <CommunityActivityFeed />
            </Suspense>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <Suspense
            fallback={
              <div className="bg-neutral-100 rounded-lg h-64 animate-pulse" />
            }
          >
            <CommunitiesSidebar />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
