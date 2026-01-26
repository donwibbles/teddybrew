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
 * Get event with full details (community, organizer, sessions with RSVPs)
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
      sessions: {
        orderBy: { startTime: "asc" },
        include: {
          rsvps: {
            where: { status: "GOING" },
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
            select: { rsvps: true },
          },
        },
      },
    },
  });
}

/**
 * Get all events for a community with session info
 */
export async function getCommunityEvents(communityId: string) {
  const events = await prisma.event.findMany({
    where: { communityId },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  // Sort by first session's start time
  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return aStart.getTime() - bStart.getTime();
  });
}

/**
 * Get upcoming events for a community (events with at least one future session)
 */
export async function getUpcomingCommunityEvents(communityId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      communityId,
      sessions: {
        some: { startTime: { gte: now } },
      },
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return aStart.getTime() - bStart.getTime();
  });
}

/**
 * Get past events for a community (all sessions in the past)
 */
export async function getPastCommunityEvents(communityId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      communityId,
      sessions: {
        every: { startTime: { lt: now } },
      },
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      sessions: {
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return bStart.getTime() - aStart.getTime();
  });
}

/**
 * Get events organized by a user
 */
export async function getEventsByOrganizer(organizerId: string) {
  const events = await prisma.event.findMany({
    where: { organizerId },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return bStart.getTime() - aStart.getTime();
  });
}

/**
 * Get upcoming events across all communities (events with at least one future session)
 */
export async function getUpcomingEvents(limit?: number) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      sessions: {
        some: { startTime: { gte: now } },
      },
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
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
    take: limit ? limit * 2 : undefined, // Get more to account for sorting
  });

  // Sort by first session start time
  const sorted = events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return aStart.getTime() - bStart.getTime();
  });

  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Check if a session is at capacity
 */
export async function isSessionFull(sessionId: string): Promise<boolean> {
  const session = await prisma.eventSession.findUnique({
    where: { id: sessionId },
    select: {
      capacity: true,
      event: { select: { capacity: true } },
      _count: {
        select: { rsvps: true },
      },
    },
  });

  if (!session) return false;

  const effectiveCapacity = session.capacity ?? session.event.capacity;
  if (!effectiveCapacity) return false;

  return session._count.rsvps >= effectiveCapacity;
}

/**
 * Get events organized by a user (including co-organized) with future sessions
 */
export async function getUserOrganizedEvents(userId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { organizerId: userId },
        { coOrganizers: { some: { id: userId } } },
      ],
      sessions: { some: { startTime: { gte: now } } },
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
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          rsvps: {
            where: { userId, status: "GOING" },
            select: { userId: true },
          },
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return aStart.getTime() - bStart.getTime();
  });
}

/**
 * Get events user is attending (has RSVP'd GOING to any session)
 */
export async function getUserAttendingEvents(userId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      sessions: {
        some: {
          startTime: { gte: now },
          rsvps: { some: { userId, status: "GOING" } },
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
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          rsvps: {
            where: { userId, status: "GOING" },
            select: { userId: true },
          },
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return aStart.getTime() - bStart.getTime();
  });
}

/**
 * Get user's past events (organized or attended)
 */
export async function getUserPastEvents(userId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      sessions: { every: { startTime: { lt: now } } },
      OR: [
        { organizerId: userId },
        { coOrganizers: { some: { id: userId } } },
        { sessions: { some: { rsvps: { some: { userId, status: "GOING" } } } } },
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
      sessions: {
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          rsvps: {
            where: { userId, status: "GOING" },
            select: { userId: true },
          },
          _count: { select: { rsvps: true } },
        },
      },
    },
    take: 20,
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return bStart.getTime() - aStart.getTime();
  });
}

/**
 * Get user's public upcoming events (for public profile visitors)
 * Only returns events from PUBLIC communities where user has RSVP'd GOING
 */
export async function getUserPublicUpcomingEvents(userId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      community: { type: "PUBLIC" },
      sessions: {
        some: {
          startTime: { gte: now },
          rsvps: { some: { userId, status: "GOING" } },
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
      sessions: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
    take: 10,
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return aStart.getTime() - bStart.getTime();
  });
}

/**
 * Get user's public past events (for public profile visitors)
 * Only returns events from PUBLIC communities where user had RSVP'd GOING
 */
export async function getUserPublicPastEvents(userId: string) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      community: { type: "PUBLIC" },
      sessions: {
        every: { startTime: { lt: now } },
        some: { rsvps: { some: { userId, status: "GOING" } } },
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
      sessions: {
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
    take: 10,
  });

  return events.sort((a, b) => {
    const aStart = a.sessions[0]?.startTime || new Date(0);
    const bStart = b.sessions[0]?.startTime || new Date(0);
    return bStart.getTime() - aStart.getTime();
  });
}
