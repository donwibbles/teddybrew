import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, Calendar, Settings } from "lucide-react";
import { CommunityTabs } from "./community-tabs";
import { JoinLeaveButton } from "./join-leave-button";
import { CommunityType } from "@prisma/client";

interface CommunityHeaderProps {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: CommunityType;
    bannerImage: string | null;
    city: string | null;
    state: string | null;
    isVirtual: boolean;
    _count: {
      members: number;
      events: number;
    };
  };
  membership: {
    isMember: boolean;
    isOwner: boolean;
    canModerate: boolean;
  };
}

export function CommunityHeader({ community, membership }: CommunityHeaderProps) {
  // Build location string
  const locationString = community.isVirtual
    ? "Virtual"
    : [community.city, community.state].filter(Boolean).join(", ") || null;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Banner Area */}
      <div className="relative aspect-[4/1] w-full">
        {community.bannerImage ? (
          <Image
            src={community.bannerImage}
            alt={`${community.name} banner`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600" />
        )}
      </div>

      {/* Community Info */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Name and Type Badge */}
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-foreground truncate">
                {community.name}
              </h1>
              {community.type === "PRIVATE" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-background-muted text-foreground-muted flex-shrink-0">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Private
                </span>
              )}
            </div>

            {/* Description (truncated to 2 lines) */}
            {community.description && (
              <p className="text-foreground-muted mb-4 line-clamp-2">
                {community.description}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {community._count.members}{" "}
                {community._count.members === 1 ? "member" : "members"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {community._count.events}{" "}
                {community._count.events === 1 ? "event" : "events"}
              </span>
              {locationString && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {locationString}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0">
            {membership.isOwner ? (
              <Link
                href={`/communities/${community.slug}/settings`}
                className="inline-flex items-center justify-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg
                           hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                           transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            ) : (
              <JoinLeaveButton
                communityId={community.id}
                communityType={community.type}
                isMember={membership.isMember}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {(community.type === "PUBLIC" || membership.isMember) && (
        <CommunityTabs
          communitySlug={community.slug}
          isMember={membership.isMember}
          canModerate={membership.canModerate}
        />
      )}
    </div>
  );
}
