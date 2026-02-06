import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserPublicProfile, getUserDashboardStats } from "@/lib/db/users";
import { getUserOrganizedEvents, getUserAttendingEvents, getUserPastEvents, getUserPublicUpcomingEvents, getUserPublicPastEvents } from "@/lib/db/events";
import { getCommunitiesByMember, getCommunitiesByOwner } from "@/lib/db/communities";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Lock, Users, Calendar, Heart, Sparkles, Settings } from "lucide-react";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

function getInitials(name: string | null | undefined): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return "U";
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getUserPublicProfile(username);

  if (!profile) {
    return { title: "User Not Found - Hive Community" };
  }

  const displayName = profile.name || `@${profile.username}`;
  const title = `${displayName} (@${profile.username}) - Hive Community`;
  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `${displayName}'s profile on Hive Community`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(profile.image && { images: [{ url: profile.image }] }),
    },
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  // Fetch the profile
  const profile = await getUserPublicProfile(username);

  // User not found - show 404
  if (!profile) {
    notFound();
  }

  // Check if current user is viewing their own profile
  const session = await auth();
  const isOwnProfile = session?.user?.id === profile.id;

  // Profile is private and viewer is not the owner
  if (!profile.isPublic && !isOwnProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-4 bg-background-muted rounded-full mb-4">
          <Lock className="h-12 w-12 text-foreground-muted" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">This profile is private</h1>
        <p className="text-foreground-muted max-w-md">
          @{profile.username} has chosen to keep their profile private.
        </p>
        <Link
          href="/"
          className="mt-6 px-4 py-2 bg-primary-subtle0 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // Fetch additional data for profile owner
  let stats = null;
  let ownedCommunities: Awaited<ReturnType<typeof getCommunitiesByOwner>> = [];
  let memberCommunities: Awaited<ReturnType<typeof getCommunitiesByMember>> = [];
  let organizedEvents: Awaited<ReturnType<typeof getUserOrganizedEvents>> = [];
  let attendingEvents: Awaited<ReturnType<typeof getUserAttendingEvents>> = [];
  let pastEvents: Awaited<ReturnType<typeof getUserPastEvents>> = [];

  // Visitor event data (for public profile)
  let visitorUpcomingEvents: Awaited<ReturnType<typeof getUserPublicUpcomingEvents>> = [];
  let visitorPastEvents: Awaited<ReturnType<typeof getUserPublicPastEvents>> = [];

  if (isOwnProfile) {
    [stats, ownedCommunities, memberCommunities, organizedEvents, attendingEvents, pastEvents] = await Promise.all([
      getUserDashboardStats(profile.id),
      getCommunitiesByOwner(profile.id),
      getCommunitiesByMember(profile.id),
      getUserOrganizedEvents(profile.id),
      getUserAttendingEvents(profile.id),
      getUserPastEvents(profile.id),
    ]);
  } else if (profile.isPublic) {
    // Fetch public events for visitors based on privacy settings
    const [upcoming, past] = await Promise.all([
      profile.showUpcomingEvents ? getUserPublicUpcomingEvents(profile.id) : Promise.resolve([]),
      profile.showPastEvents ? getUserPublicPastEvents(profile.id) : Promise.resolve([]),
    ]);
    visitorUpcomingEvents = upcoming;
    visitorPastEvents = past;
  }

  const joinedCommunities = memberCommunities.filter((c) => c.ownerId !== profile.id);

  // Determine what sections to show for visitors
  const showCommunities = isOwnProfile || profile.showCommunities;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.image ?? undefined} alt={profile.name ?? "User"} />
              <AvatarFallback className="text-2xl bg-primary-subtle-hover text-primary-700">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.name || "Anonymous User"}
                  </h1>
                  {profile.username && (
                    <p className="text-foreground-muted">@{profile.username}</p>
                  )}
                </div>
                {isOwnProfile && (
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg
                               hover:bg-background-hover transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </Link>
                )}
              </div>

              {profile.bio && (
                <p className="mt-3 text-foreground">{profile.bio}</p>
              )}

              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm text-foreground-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {formatDate(profile.createdAt)}
                </span>
                {showCommunities && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {profile.communities.length} public {profile.communities.length === 1 ? "community" : "communities"}
                  </span>
                )}
              </div>

              {/* Stats for owner */}
              {isOwnProfile && stats && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm text-foreground-muted">
                  <span>
                    <strong className="text-foreground">{stats.communitiesOwned + stats.communitiesJoined}</strong> communities
                  </span>
                  <span>
                    <strong className="text-foreground">{stats.eventsOrganized}</strong> events organized
                  </span>
                  <span>
                    <strong className="text-foreground">{stats.upcomingRsvps}</strong> upcoming RSVPs
                  </span>
                </div>
              )}

              {/* Privacy indicator for owner */}
              {isOwnProfile && !profile.isPublic && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-background-muted rounded-full text-sm text-foreground-muted">
                  <Lock className="h-3.5 w-3.5" />
                  Your profile is private
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      {(profile.interests || profile.communityHope) && (
        <div className="grid md:grid-cols-2 gap-6">
          {profile.interests && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5 text-primary-500" />
                  What matters to me
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{profile.interests}</p>
              </CardContent>
            </Card>
          )}
          {profile.communityHope && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  What gives me hope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{profile.communityHope}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Owner-only detailed sections */}
      {isOwnProfile && (
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
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-background-hover transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{community.name}</p>
                        <p className="text-sm text-foreground-muted">
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
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-background-hover transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{community.name}</p>
                        <p className="text-sm text-foreground-muted">
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
      )}

      {/* Owner-only Event sections */}
      {isOwnProfile && (
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
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-background-hover transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <p className="text-sm text-foreground-muted">
                          {event.sessions[0]?.startTime
                            ? new Date(event.sessions[0].startTime).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                timeZone: event.timezone || undefined,
                              })
                            : "No sessions"}
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
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-background-hover transition-colors"
                      >
                        <div>
                          <p className="font-medium text-foreground">{event.title}</p>
                          <p className="text-sm text-foreground-muted">
                            {event.sessions[0]?.startTime
                              ? new Date(event.sessions[0].startTime).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  timeZone: event.timezone || undefined,
                                })
                              : "No sessions"}
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
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-background-hover transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <p className="text-sm text-foreground-muted">
                          {event.sessions[0]?.startTime
                            ? new Date(event.sessions[0].startTime).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                timeZone: event.timezone || undefined,
                              })
                            : "No sessions"}
                        </p>
                      </div>
                      <span className="text-foreground-muted">&rarr;</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Public Communities Section (for visitors when allowed) */}
      {!isOwnProfile && showCommunities && profile.communities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-foreground-muted" />
              Communities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.communities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-background-hover hover:border-border transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{community.name}</p>
                    {community.description && (
                      <p className="text-sm text-foreground-muted truncate">{community.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {community.memberCount} {community.memberCount === 1 ? "member" : "members"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visitor Event Sections (for public profile with events enabled) */}
      {!isOwnProfile && profile.isPublic && (visitorUpcomingEvents.length > 0 || visitorPastEvents.length > 0) && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Visitor Upcoming Events */}
          {profile.showUpcomingEvents && visitorUpcomingEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-foreground-muted" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visitorUpcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/communities/${event.community.slug}/events/${event.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-background-hover hover:border-border transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <p className="text-sm text-foreground-muted">
                          {event.sessions[0]?.startTime
                            ? new Date(event.sessions[0].startTime).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                timeZone: event.timezone || undefined,
                              })
                            : "No sessions"}
                          {" "}· {event.community.name}
                        </p>
                      </div>
                      <span className="text-foreground-muted">&rarr;</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visitor Past Events */}
          {profile.showPastEvents && visitorPastEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-foreground-muted" />
                  Past Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {visitorPastEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/communities/${event.community.slug}/events/${event.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-background-hover hover:border-border transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <p className="text-sm text-foreground-muted">
                          {event.sessions[0]?.startTime
                            ? new Date(event.sessions[0].startTime).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                timeZone: event.timezone || undefined,
                              })
                            : "No sessions"}
                          {" "}· {event.community.name}
                        </p>
                      </div>
                      <span className="text-foreground-muted">&rarr;</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No content message for visitors */}
      {!isOwnProfile && !showCommunities && !profile.showUpcomingEvents && !profile.showPastEvents && !profile.interests && !profile.communityHope && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-foreground-muted">
              <p>@{profile.username} hasn&apos;t shared any public information yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
