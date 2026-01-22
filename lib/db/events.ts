import "server-only";

import { prisma } from "@/lib/prisma";
import { Event } from "@prisma/client";

/**
 * Event database queries
 */

/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<Event | null> {
  return await prisma.event.findUnique({
    where: { id },
  });
}

/**
 * Get event with full details (community, organizer, RSVPs)
 */
export async function getEventWithDetails(id: string) {
  return await prisma.event.findUnique({
    where: { id },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      coOrganizers: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
  });
}

/**
 * Get all events for a community
 */
export async function getCommunityEvents(communityId: string) {
  return await prisma.event.findMany({
    where: { communityId },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get upcoming events for a community
 */
export async function getUpcomingCommunityEvents(communityId: string) {
  const now = new Date();
  return await prisma.event.findMany({
    where: {
      communityId,
      startTime: { gte: now },
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get past events for a community
 */
export async function getPastCommunityEvents(communityId: string) {
  const now = new Date();
  return await prisma.event.findMany({
    where: {
      communityId,
      startTime: { lt: now },
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  });
}

/**
 * Get events organized by a user
 */
export async function getEventsByOrganizer(organizerId: string) {
  return await prisma.event.findMany({
    where: { organizerId },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  });
}

/**
 * Get upcoming events across all communities
 */
export async function getUpcomingEvents(limit?: number) {
  const now = new Date();
  return await prisma.event.findMany({
    where: {
      startTime: { gte: now },
    },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
          type: true,
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
    take: limit,
  });
}

/**
 * Check if event is at capacity
 */
export async function isEventFull(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      capacity: true,
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
  });

  if (!event || !event.capacity) {
    return false; // No capacity limit
  }

  return event._count.rsvps >= event.capacity;
}

/**
 * Get events organized by a user (including co-organized)
 */
export async function getUserOrganizedEvents(userId: string) {
  const now = new Date();
  return await prisma.event.findMany({
    where: {
      OR: [
        { organizerId: userId },
        { coOrganizers: { some: { id: userId } } },
      ],
      startTime: { gte: now },
    },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get events user is attending (has RSVP'd GOING)
 */
export async function getUserAttendingEvents(userId: string) {
  const now = new Date();
  return await prisma.event.findMany({
    where: {
      startTime: { gte: now },
      rsvps: {
        some: {
          userId,
          status: "GOING",
        },
      },
    },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get user's past events (organized or attended)
 */
export async function getUserPastEvents(userId: string) {
  const now = new Date();
  return await prisma.event.findMany({
    where: {
      startTime: { lt: now },
      OR: [
        { organizerId: userId },
        { coOrganizers: { some: { id: userId } } },
        { rsvps: { some: { userId, status: "GOING" } } },
      ],
    },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          rsvps: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
    take: 20,
  });
}
