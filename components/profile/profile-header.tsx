"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileEditForm } from "./profile-edit-form";
import { ExternalLink } from "lucide-react";

interface ProfileHeaderProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
    bio?: string | null;
    interests?: string | null;
    communityHope?: string | null;
    isPublic?: boolean;
    showUpcomingEvents?: boolean;
    showPastEvents?: boolean;
    showCommunities?: boolean;
    emailEventReminders?: boolean;
  };
  stats: {
    communitiesOwned: number;
    communitiesJoined: number;
    eventsOrganized: number;
    upcomingRsvps: number;
  };
  isNewUser: boolean;
}

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

export function ProfileHeader({ user, stats, isNewUser }: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(isNewUser);

  if (isNewUser || isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-20 w-20 mx-auto md:mx-0">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xl bg-primary-subtle-hover text-primary-700">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isNewUser && (
                <div className="mb-4">
                  <h1 className="text-2xl font-bold text-foreground">
                    Welcome to Hive Community!
                  </h1>
                  <p className="text-foreground-muted mt-1">
                    Let&apos;s set up your profile. Choose a display name and username to get started.
                  </p>
                </div>
              )}
              {!isNewUser && (
                <h2 className="text-lg font-semibold text-foreground mb-4">Edit Profile</h2>
              )}
              <ProfileEditForm
                initialFirstName={user.firstName}
                initialLastName={user.lastName}
                initialName={user.name}
                initialUsername={user.username}
                initialBio={user.bio}
                initialInterests={user.interests}
                initialCommunityHope={user.communityHope}
                initialIsPublic={user.isPublic ?? true}
                initialShowUpcomingEvents={user.showUpcomingEvents ?? true}
                initialShowPastEvents={user.showPastEvents ?? false}
                initialShowCommunities={user.showCommunities ?? true}
                initialEmailEventReminders={user.emailEventReminders ?? true}
                onCancel={!isNewUser ? () => setIsEditing(false) : undefined}
                isOnboarding={isNewUser}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xl bg-primary-subtle-hover text-primary-700">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {user.name || "Anonymous User"}
              </h1>
              {user.username && (
                <p className="text-foreground-muted">@{user.username}</p>
              )}
              <p className="text-sm text-foreground-muted mt-1">{user.email}</p>
              {user.bio && (
                <p className="text-foreground mt-3">{user.bio}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-foreground-muted">
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
              {user.username && (
                <Link
                  href={`/u/${user.username}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary-600 hover:text-primary-700"
                >
                  View public profile
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg
                       hover:bg-background-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border
                       transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
