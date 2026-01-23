import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users, Calendar } from "lucide-react";
import { getUserDashboardStats, getUserById } from "@/lib/db/users";
import { getCommunitiesByMember, getCommunitiesByOwner } from "@/lib/db/communities";
import { getUserOrganizedEvents, getUserAttendingEvents, getUserPastEvents } from "@/lib/db/events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileHeader } from "@/components/profile/profile-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  const [user, stats, ownedCommunities, memberCommunities, organizedEvents, attendingEvents, pastEvents] =
    await Promise.all([
      getUserById(userId),
      getUserDashboardStats(userId),
      getCommunitiesByOwner(userId),
      getCommunitiesByMember(userId),
      getUserOrganizedEvents(userId),
      getUserAttendingEvents(userId),
      getUserPastEvents(userId),
    ]);

  if (!user) {
    redirect("/sign-in");
  }

  const joinedCommunities = memberCommunities.filter((c) => c.ownerId !== userId);

  // Check if this is a new user (no firstName/lastName and no username set)
  const isNewUser = !user.firstName && !user.lastName && !user.username;

  return (
    <div className="space-y-8">
      {/* Profile Header with Edit */}
      <ProfileHeader
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          name: user.name,
          username: user.username,
          email: user.email,
          image: session.user.image ?? null,
          bio: user.bio,
          interests: user.interests,
          communityHope: user.communityHope,
          isPublic: user.isPublic,
        }}
        stats={stats}
        isNewUser={isNewUser}
      />

      <div className="grid md:grid-cols-2 gap-8">
        {/* Communities Owned */}
        <Card>
          <CardHeader>
            <CardTitle>Communities I Own</CardTitle>
            <CardDescription>Communities you created and manage</CardDescription>
          </CardHeader>
          <CardContent>
            {ownedCommunities.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No communities yet"
                description="You haven't created any communities yet."
                className="py-4"
              />
            ) : (
              <div className="space-y-3">
                {ownedCommunities.map((community) => (
                  <Link
                    key={community.id}
                    href={`/communities/${community.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{community.name}</p>
                      <p className="text-sm text-neutral-500">
                        {community._count.members} members &middot; {community._count.events} events
                      </p>
                    </div>
                    <Badge variant="secondary">Owner</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Communities Joined */}
        <Card>
          <CardHeader>
            <CardTitle>Communities I&apos;ve Joined</CardTitle>
            <CardDescription>Communities you&apos;re a member of</CardDescription>
          </CardHeader>
          <CardContent>
            {joinedCommunities.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No communities joined"
                description="You haven't joined any other communities yet."
                className="py-4"
              />
            ) : (
              <div className="space-y-3">
                {joinedCommunities.map((community) => (
                  <Link
                    key={community.id}
                    href={`/communities/${community.slug}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{community.name}</p>
                      <p className="text-sm text-neutral-500">
                        {community._count.members} members &middot; {community._count.events} events
                      </p>
                    </div>
                    <Badge variant="outline">Member</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events Sections */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Events you&apos;re organizing or attending</CardDescription>
          </CardHeader>
          <CardContent>
            {organizedEvents.length === 0 && attendingEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming events"
                description="No events you're organizing or attending."
                className="py-4"
              />
            ) : (
              <div className="space-y-3">
                {organizedEvents.map((event) => (
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
                        })}
                      </p>
                    </div>
                    <Badge>Organizer</Badge>
                  </Link>
                ))}
                {attendingEvents
                  .filter((e) => !organizedEvents.some((o) => o.id === e.id))
                  .map((event) => (
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
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary">Attending</Badge>
                    </Link>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Events */}
        <Card>
          <CardHeader>
            <CardTitle>Past Events</CardTitle>
            <CardDescription>Events you&apos;ve attended or organized</CardDescription>
          </CardHeader>
          <CardContent>
            {pastEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No past events"
                description="No events you've attended or organized."
                className="py-4"
              />
            ) : (
              <div className="space-y-3">
                {pastEvents.slice(0, 10).map((event) => (
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
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-neutral-400">&rarr;</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
