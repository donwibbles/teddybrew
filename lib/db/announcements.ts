import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Announcement database queries
 */

/**
 * Get active announcements for a community (shown in banner)
 */
export async function getActiveAnnouncements(communityId: string) {
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
}

/**
 * Get all announcements for a community (for management UI)
 */
export async function getAllAnnouncements(communityId: string) {
  return await prisma.announcement.findMany({
    where: { communityId },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
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
}

/**
 * Get count of active announcements for a community
 */
export async function getActiveAnnouncementCount(communityId: string): Promise<number> {
  return await prisma.announcement.count({
    where: {
      communityId,
      isActive: true,
    },
  });
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncementById(announcementId: string) {
  return await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });
}
