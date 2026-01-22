import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserDashboardStats } from "@/lib/db/users";
import { getCommunitiesByMember, getCommunitiesByOwner } from "@/lib/db/communities";
import { getUserOrganizedEvents, getUserAttendingEvents, getUserPastEvents } from "@/lib/db/events";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "U";
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  const [stats, ownedCommunities, memberCommunities, organizedEvents, attendingEvents, pastEvents] =
    await Promise.all([
      getUserDashboardStats(userId),
      getCommunitiesByOwner(userId),
      getCommunitiesByMember(userId),
      getUserOrganizedEvents(userId),
      getUserAttendingEvents(userId),
      getUserPastEvents(userId),
    ]);

  const joinedCommunities = memberCommunities.filter((c) => c.ownerId !== userId);

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
              <AvatarFallback className="text-xl bg-primary-100 text-primary-700">
                {getInitials(session.user.name, session.user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {session.user.name || "Anonymous User"}
              </h1>
              <p className="text-neutral-600">{session.user.email}</p>
              <div className="flex gap-4 mt-3 text-sm text-neutral-500">
                <span>
                  <strong className="text-neutral-900">{stats.communitiesOwned + stats.communitiesJoined}</strong> communities
                </span>
                <span>
                  <strong className="text-neutral-900">{stats.eventsOrganized}</strong> events organized
                </span>
                <span>
                  <strong className="text-neutral-900">{stats.upcomingRsvps}</strong> upcoming RSVPs
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Communities Owned */}
        <Card>
          <CardHeader>
            <CardTitle>Communities I Own</CardTitle>
            <CardDescription>Communities you created and manage</CardDescription>
          </CardHeader>
          <CardContent>
            {ownedCommunities.length === 0 ? (
              <p className="text-neutral-500 text-center py-4">
                You haven&apos;t created any communities yet.
              </p>
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
              <p className="text-neutral-500 text-center py-4">
                You haven&apos;t joined any other communities yet.
              </p>
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
              <p className="text-neutral-500 text-center py-4">No upcoming events.</p>
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
              <p className="text-neutral-500 text-center py-4">No past events.</p>
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
