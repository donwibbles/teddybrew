import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { MemberRole } from "@prisma/client";

/**
 * Cached database queries for request-scoped deduplication.
 *
 * These queries use React's cache() function to automatically deduplicate
 * identical queries within a single request. This prevents N+1 query patterns
 * when the same data is requested multiple times (e.g., in generateMetadata,
 * layout, and page components).
 *
 * IMPORTANT: Use these cached versions for READ operations in page components.
 * For server actions that mutate data, use the uncached versions in
 * lib/db/communities.ts, lib/db/members.ts, etc. to ensure fresh data.
 */

/**
 * Get community with full details (members, events, owner)
 * Cached per request - safe to call multiple times in the same request
 */
export const getCommunityWithDetails = cache(async (slug: string) => {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      events: {
        where: {
          sessions: { some: { startTime: { gte: new Date() } } },
        },
        select: {
          id: true,
          title: true,
          location: true,
          timezone: true,
          sessions: {
            orderBy: { startTime: "asc" as const },
            select: {
              id: true,
              startTime: true,
              endTime: true,
              _count: { select: { rsvps: true } },
            },
          },
          organizer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          events: true,
        },
      },
    },
  });

  // Sort events by first session's startTime
  if (community?.events) {
    community.events.sort((a, b) => {
      const aStart = a.sessions[0]?.startTime || new Date(0);
      const bStart = b.sessions[0]?.startTime || new Date(0);
      return aStart.getTime() - bStart.getTime();
    });
  }

  return community;
});

/**
 * Get user's membership status for a community
 * Cached per request - safe to call multiple times in the same request
 */
export const getMembershipStatus = cache(async (communityId: string) => {
  try {
    const { userId } = await verifySession();

    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      select: { role: true },
    });

    const role = membership?.role ?? null;
    const isOwner = role === MemberRole.OWNER;
    const isModerator = role === MemberRole.MODERATOR;

    return {
      userId,
      isMember: !!membership,
      isOwner,
      isModerator,
      canModerate: isOwner || isModerator,
      role,
    };
  } catch {
    return {
      userId: null,
      isMember: false,
      isOwner: false,
      isModerator: false,
      canModerate: false,
      role: null,
    };
  }
});

/**
 * Get all members of a community
 * Cached per request - safe to call multiple times in the same request
 */
export const getCommunityMembers = cache(
  async (communityId: string, limit: number = 100) => {
    return await prisma.member.findMany({
      where: { communityId },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
            isPublic: true,
          },
        },
      },
      orderBy: [{ role: "desc" }, { joinedAt: "desc" }],
    });
  }
);

/**
 * Get spotlighted events for a community
 * Cached per request - safe to call multiple times in the same request
 */
export const getSpotlightedEvents = cache(
  async (communityId: string, limit: number = 3) => {
    return await prisma.event.findMany({
      where: {
        communityId,
        isSpotlighted: true,
        sessions: { some: { startTime: { gte: new Date() } } },
      },
      orderBy: { spotlightOrder: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        location: true,
        isVirtual: true,
        timezone: true,
        coverImage: true,
        sessions: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 1,
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
  }
);

/**
 * Get active announcements for a community
 * Cached per request - safe to call multiple times in the same request
 */
export const getActiveAnnouncements = cache(async (communityId: string) => {
  return await prisma.announcement.findMany({
    where: {
      communityId,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
});
