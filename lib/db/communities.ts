import "server-only";

import { prisma } from "@/lib/prisma";
import { Community, CommunityType } from "@prisma/client";

/**
 * Community database queries
 */

/**
 * Get community by slug
 */
export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  return await prisma.community.findUnique({
    where: { slug },
  });
}

/**
 * Get community by ID
 */
export async function getCommunityById(id: string): Promise<Community | null> {
  return await prisma.community.findUnique({
    where: { id },
  });
}

/**
 * Get community with full details (members, events, owner)
 * Note: events are filtered to only include events with upcoming sessions
 */
export async function getCommunityWithDetails(slug: string) {
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
}

/**
 * Get all public communities
 */
export async function getPublicCommunities() {
  return await prisma.community.findMany({
    where: { type: CommunityType.PUBLIC },
    take: 100,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          members: true,
          events: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get communities owned by a user
 */
export async function getCommunitiesByOwner(ownerId: string) {
  return await prisma.community.findMany({
    where: { ownerId },
    take: 100,
    include: {
      _count: {
        select: {
          members: true,
          events: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get communities where user is a member
 */
export async function getCommunitiesByMember(userId: string) {
  return await prisma.community.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    take: 100,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          members: true,
          events: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await prisma.community.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !existing;
}

/**
 * Get spotlighted events for a community
 * Only returns events with upcoming sessions
 */
export async function getSpotlightedEvents(communityId: string, limit: number = 3) {
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

/**
 * Get count of spotlighted events for a community
 */
export async function getSpotlightedEventCount(communityId: string): Promise<number> {
  return await prisma.event.count({
    where: {
      communityId,
      isSpotlighted: true,
    },
  });
}

/**
 * Get all events for spotlight management (with upcoming sessions)
 */
export async function getEventsForSpotlightManagement(communityId: string) {
  return await prisma.event.findMany({
    where: {
      communityId,
      sessions: { some: { startTime: { gte: new Date() } } },
    },
    orderBy: [
      { isSpotlighted: "desc" },
      { spotlightOrder: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      location: true,
      isVirtual: true,
      isSpotlighted: true,
      spotlightOrder: true,
      sessions: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 1,
        select: {
          id: true,
          startTime: true,
        },
      },
    },
  });
}
