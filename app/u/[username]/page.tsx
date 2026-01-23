import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserPublicProfile } from "@/lib/db/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Calendar, Heart, Sparkles } from "lucide-react";

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
        <div className="p-4 bg-neutral-100 rounded-full mb-4">
          <Lock className="h-12 w-12 text-neutral-400" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">This profile is private</h1>
        <p className="text-neutral-600 max-w-md">
          @{profile.username} has chosen to keep their profile private.
        </p>
        <Link
          href="/"
          className="mt-6 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.image ?? undefined} alt={profile.name ?? "User"} />
              <AvatarFallback className="text-2xl bg-primary-100 text-primary-700">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-neutral-900">
                {profile.name || "Anonymous User"}
              </h1>
              {profile.username && (
                <p className="text-neutral-600">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="mt-3 text-neutral-700">{profile.bio}</p>
              )}
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm text-neutral-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {formatDate(profile.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {profile.communities.length} public {profile.communities.length === 1 ? "community" : "communities"}
                </span>
              </div>
              {isOwnProfile && (
                <Link
                  href="/profile"
                  className="inline-block mt-4 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg
                             hover:bg-neutral-50 transition-colors"
                >
                  Edit Profile
                </Link>
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
                <p className="text-neutral-700 whitespace-pre-wrap">{profile.interests}</p>
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
                <p className="text-neutral-700 whitespace-pre-wrap">{profile.communityHope}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Communities Section */}
      {profile.communities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-neutral-500" />
              Communities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {profile.communities.map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-900 truncate">{community.name}</p>
                    {community.description && (
                      <p className="text-sm text-neutral-500 truncate">{community.description}</p>
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
    </div>
  );
}
