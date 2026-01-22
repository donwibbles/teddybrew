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
 * Note: events are filtered to only include upcoming events (startTime >= now)
 */
export async function getCommunityWithDetails(slug: string) {
  return await prisma.community.findUnique({
    where: { slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      events: {
        where: {
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
      },
      _count: {
        select: {
          members: true,
          events: true,
        },
      },
    },
  });
}

/**
 * Get all public communities
 */
export async function getPublicCommunities() {
  return await prisma.community.findMany({
    where: { type: CommunityType.PUBLIC },
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
