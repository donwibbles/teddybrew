import { Suspense } from "react";
import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { verifySession } from "@/lib/dal";
import {
  getUserOrganizedEvents,
  getUserAttendingEvents,
} from "@/lib/db/events";
import { getUserCommunityActivity, getUserCommunities } from "@/lib/db/activity";
import { getUserCommunityAnnouncements } from "@/lib/db/announcements";
import { EventCard } from "@/components/event/event-card";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/activity/activity-feed";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardAnnouncementBanner } from "@/components/dashboard/announcements-banner";
import {
  UpcomingEventsSidebar,
  UpcomingEventsSidebarSkeleton,
} from "@/components/dashboard/upcoming-events-sidebar";
import {
  CommunitiesSidebar,
  CommunitiesSidebarSkeleton,
} from "@/components/dashboard/communities-sidebar";
import { NewUserEmptyState } from "@/components/dashboard/new-user-empty-state";

export const metadata = {
  title: "Dashboard - Hive Community",
  description: "Your communities, events, and activity feed",
};

async function AnnouncementsSection() {
  const { userId } = await verifySession();
  const announcements = await getUserCommunityAnnouncements(userId);

  if (announcements.length === 0) return null;

  return <DashboardAnnouncementBanner announcements={announcements} />;
}

async function MyEventsList() {
  const { userId } = await verifySession();

  const [organizing, attending] = await Promise.all([
    getUserOrganizedEvents(userId),
    getUserAttendingEvents(userId),
  ]);

  const organizingIds = new Set(organizing.map((e) => e.id));
  const attendingOnly = attending.filter((e) => !organizingIds.has(e.id));

  const hasEvents = organizing.length > 0 || attendingOnly.length > 0;

  if (!hasEvents) {
    return (
      <EmptyState
        icon={Calendar}
        title="No upcoming events"
        description="Discover events happening in your communities"
        action={
          <Link
            href="/events"
            className="inline-flex items-center px-4 py-2 bg-primary-subtle0 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Browse Events
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {organizing.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-3">
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

      {attendingOnly.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-3">
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

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No recent activity"
        description="Join more communities to see what's happening!"
        action={
          <Link
            href="/communities"
            className="inline-flex items-center px-4 py-2 bg-primary-subtle0 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Browse Communities
          </Link>
        }
      />
    );
  }

  return (
    <ActivityFeed
      initialItems={items}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
    />
  );
}

export default async function DashboardPage() {
  const { userId } = await verifySession();
  const communities = await getUserCommunities(userId);

  if (communities.length === 0) {
    return <NewUserEmptyState />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-foreground-muted mt-1">
          Your events and activity from communities you&apos;ve joined
        </p>
      </div>

      {/* Announcements */}
      <Suspense fallback={null}>
        <AnnouncementsSection />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Your Events Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Your Events</h2>
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
                      className="h-48 bg-background-muted rounded-lg animate-pulse"
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
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Recent Activity
            </h2>
            <p className="text-sm text-foreground-muted mb-4">
              New events and posts from your communities in the last 7 days
            </p>
            <Suspense fallback={<ActivityFeedSkeleton count={5} />}>
              <CommunityActivityFeed />
            </Suspense>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <Suspense fallback={<UpcomingEventsSidebarSkeleton />}>
            <UpcomingEventsSidebar />
          </Suspense>

          <Suspense fallback={<CommunitiesSidebarSkeleton />}>
            <CommunitiesSidebar communities={communities} userId={userId} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
