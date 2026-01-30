import Link from "next/link";
import Image from "next/image";
import { CommunityType } from "@prisma/client";
import { getGradientFromString } from "@/lib/utils/gradient-placeholder";

interface CommunityCardProps {
  community: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: CommunityType;
    state?: string | null;
    isVirtual?: boolean;
    cardImage?: string | null;
    owner: {
      id: string;
      name: string | null;
      image: string | null;
    };
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
  const gradientClasses = getGradientFromString(community.name);

  return (
    <Link
      href={`/communities/${community.slug}`}
      className="block bg-white rounded-lg border border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Card Image Section */}
      <div className="relative aspect-[16/9] w-full">
        {community.cardImage ? (
          <Image
            src={community.cardImage}
            alt={community.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientClasses}`} />
        )}

        {/* Type badges overlaid on image */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-end">
          <div className="flex items-center gap-1.5">
            {community.type === "PRIVATE" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/90 backdrop-blur-sm text-neutral-700 shadow-sm">
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
            {community.isVirtual && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/90 backdrop-blur-sm text-blue-700 shadow-sm">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Virtual
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Title and membership badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-neutral-900 line-clamp-1">
            {community.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
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
          </div>
        </div>

        {/* Description */}
        {community.description && (
          <p className="text-neutral-600 text-sm mb-3 line-clamp-2">
            {community.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          {/* Location */}
          {community.isVirtual ? (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Online
            </span>
          ) : community.state && (
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {community.state}
            </span>
          )}

          <span className="text-neutral-300">·</span>

          {/* Members */}
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
            {community._count.members}
          </span>

          <span className="text-neutral-300">·</span>

          {/* Events */}
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
            {community._count.events}
          </span>
        </div>
      </div>
    </Link>
  );
}
