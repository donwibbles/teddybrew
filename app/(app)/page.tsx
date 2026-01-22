import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserDashboardStats } from "@/lib/db/users";
import { getCommunitiesByMember, getCommunitiesByOwner } from "@/lib/db/communities";
import { getUserAttendingEvents, getUserOrganizedEvents } from "@/lib/db/events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  const [stats, ownedCommunities, memberCommunities, organizedEvents, attendingEvents] =
    await Promise.all([
      getUserDashboardStats(userId),
      getCommunitiesByOwner(userId),
      getCommunitiesByMember(userId),
      getUserOrganizedEvents(userId),
      getUserAttendingEvents(userId),
    ]);

  const allCommunities = [
    ...ownedCommunities.map((c) => ({ ...c, isOwner: true })),
    ...memberCommunities.filter((c) => c.ownerId !== userId).map((c) => ({ ...c, isOwner: false })),
  ].slice(0, 5);

  const upcomingEvents = [...organizedEvents, ...attendingEvents]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome back{session.user.name ? `, ${session.user.name}` : ""}!
        </h1>
        <p className="text-neutral-600 mt-1">
          Here&apos;s what&apos;s happening in your communities.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Communities Owned</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary-600">{stats.communitiesOwned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Communities Joined</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary-600">{stats.communitiesJoined}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events Organized</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary-600">{stats.eventsOrganized}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming RSVPs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary-600">{stats.upcomingRsvps}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* My Communities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Communities</CardTitle>
              <Link href="/communities">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {allCommunities.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neutral-600 mb-4">You haven&apos;t joined any communities yet.</p>
                <Link href="/communities">
                  <Button>Discover Communities</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {allCommunities.map((community) => (
                  <Link
                    key={community.id}
                    href={`/communities/${community.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{community.name}</p>
                      <p className="text-sm text-neutral-500">
                        {community._count.members} members
                        {community.isOwner && (
                          <span className="ml-2 text-primary-600 font-medium">Owner</span>
                        )}
                      </p>
                    </div>
                    <span className="text-neutral-400">&rarr;</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Link href="/my-events">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neutral-600 mb-4">No upcoming events.</p>
                <Link href="/events">
                  <Button>Discover Events</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/communities/${event.community.slug}/events/${event.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{event.title}</p>
                      <p className="text-sm text-neutral-500">
                        {new Date(event.startTime).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-neutral-400">{event.community.name}</p>
                    </div>
                    <span className="text-neutral-400">&rarr;</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/communities/new">
              <Button>Create Community</Button>
            </Link>
            <Link href="/communities">
              <Button variant="outline">Browse Communities</Button>
            </Link>
            <Link href="/events">
              <Button variant="outline">Browse Events</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
