import Link from "next/link";
import { CommunityType } from "@prisma/client";
import { TagBadgeList } from "@/components/tags/tag-badge";

interface CommunityCardProps {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: CommunityType;
    state?: string | null;
    isVirtual?: boolean;
    owner: {
      id: string;
      name: string | null;
      image: string | null;
    };
    issueTags?: Array<{ slug: string; name: string }>;
    _count: {
      members: number;
      events: number;
    };
  };
  membership: {
    isMember: boolean;
    isOwner: boolean;
    role: string | null;
  };
}

export function CommunityCard({ community, membership }: CommunityCardProps) {
  return (
    <Link
      href={`/communities/${community.slug}`}
      className="block bg-white rounded-lg border border-neutral-200 p-6 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-neutral-900 line-clamp-1">
          {community.name}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {membership.isOwner && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
              Owner
            </span>
          )}
          {membership.isMember && !membership.isOwner && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success-100 text-success-700">
              Member
            </span>
          )}
          {community.type === "PRIVATE" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
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
      </div>

      {community.description && (
        <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
          {community.description}
        </p>
      )}

      {/* Location & Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {community.isVirtual && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            Virtual
          </span>
        )}
        {community.state && !community.isVirtual && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600">
            {community.state}
          </span>
        )}
        {community.issueTags && community.issueTags.length > 0 && (
          <TagBadgeList
            tags={community.issueTags}
            maxVisible={2}
            size="sm"
            variant="default"
          />
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {community._count.members}{" "}
            {community._count.members === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {community._count.events}{" "}
            {community._count.events === 1 ? "event" : "events"}
          </span>
        </div>
        <span className="text-neutral-400">
          by {community.owner.name || "Unknown"}
        </span>
      </div>
    </Link>
  );
}
