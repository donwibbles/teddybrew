import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserPublicProfile } from "@/lib/db/users";
import { getUserPublicUpcomingEvents, getUserPublicPastEvents } from "@/lib/db/events";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Calendar, Heart, Sparkles, Settings, Eye } from "lucide-react";

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

  // Fetch public event data (same data for both owner preview and visitors)
  let publicUpcomingEvents: Awaited<ReturnType<typeof getUserPublicUpcomingEvents>> = [];
  let publicPastEvents: Awaited<ReturnType<typeof getUserPublicPastEvents>> = [];

  if (profile.isPublic || isOwnProfile) {
    const [upcoming, past] = await Promise.all([
      profile.showUpcomingEvents ? getUserPublicUpcomingEvents(profile.id) : Promise.resolve([]),
      profile.showPastEvents ? getUserPublicPastEvents(profile.id) : Promise.resolve([]),
    ]);
    publicUpcomingEvents = upcoming;
    publicPastEvents = past;
  }

  // Determine what sections to show
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

      {/* Preview banner for owner */}
      {isOwnProfile && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary-subtle rounded-lg text-sm text-primary-700">
          <Eye className="h-4 w-4 shrink-0" />
          <p>
            This is how others see your profile.{" "}
            <Link href="/settings" className="font-medium underline underline-offset-2 hover:text-primary-800">
              Edit Profile
            </Link>
          </p>
        </div>
      )}

      {/* Public Communities Section */}
      {showCommunities && profile.communities.length > 0 && (
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

      {/* Public Event Sections */}
      {(profile.isPublic || isOwnProfile) && (publicUpcomingEvents.length > 0 || publicPastEvents.length > 0) && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Upcoming Events */}
          {profile.showUpcomingEvents && publicUpcomingEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-foreground-muted" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {publicUpcomingEvents.map((event) => (
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

          {/* Past Events */}
          {profile.showPastEvents && publicPastEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-foreground-muted" />
                  Past Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {publicPastEvents.map((event) => (
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

      {/* No content message */}
      {!showCommunities && !profile.showUpcomingEvents && !profile.showPastEvents && !profile.interests && !profile.communityHope && (
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
