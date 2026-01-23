import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Session database queries for multi-session events
 */

/**
 * Get an event with all its sessions and RSVP counts
 */
export async function getEventWithSessions(eventId: string) {
  return await prisma.event.findUnique({
    where: { id: eventId },
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
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
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
 * Get sessions a user is attending for an event
 */
export async function getUserSessionsForEvent(
  eventId: string,
  userId: string
) {
  return await prisma.eventSession.findMany({
    where: {
      eventId,
      rsvps: {
        some: {
          userId,
          status: "GOING",
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Check if user is attending any session of an event
 */
export async function isUserAttendingEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  const attendance = await prisma.rSVP.findFirst({
    where: {
      userId,
      status: "GOING",
      session: {
        eventId,
      },
    },
  });
  return !!attendance;
}

/**
 * Get total unique attendees for an event (across all sessions)
 */
export async function getEventAttendeeCount(eventId: string): Promise<number> {
  const result = await prisma.rSVP.findMany({
    where: {
      status: "GOING",
      session: {
        eventId,
      },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });
  return result.length;
}

/**
 * Get all attendees for an event (unique users across all sessions)
 */
export async function getEventAttendees(eventId: string) {
  const rsvps = await prisma.rSVP.findMany({
    where: {
      status: "GOING",
      session: {
        eventId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      session: {
        select: {
          id: true,
          title: true,
          startTime: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Deduplicate by user, keeping all sessions
  const userMap = new Map<
    string,
    {
      user: { id: string; name: string | null; image: string | null };
      sessions: Array<{ id: string; title: string | null; startTime: Date }>;
    }
  >();

  for (const rsvp of rsvps) {
    const existing = userMap.get(rsvp.userId);
    if (existing) {
      existing.sessions.push(rsvp.session);
    } else {
      userMap.set(rsvp.userId, {
        user: rsvp.user,
        sessions: [rsvp.session],
      });
    }
  }

  return Array.from(userMap.values());
}

/**
 * Get the first (or only) session of an event
 */
export async function getFirstSession(eventId: string) {
  return await prisma.eventSession.findFirst({
    where: { eventId },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get session count for an event
 */
export async function getSessionCount(eventId: string): Promise<number> {
  return await prisma.eventSession.count({
    where: { eventId },
  });
}

/**
 * Get the date range for an event (earliest start to latest end)
 */
export async function getEventDateRange(eventId: string): Promise<{
  startTime: Date | null;
  endTime: Date | null;
}> {
  const sessions = await prisma.eventSession.findMany({
    where: { eventId },
    select: {
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: "asc" },
  });

  if (sessions.length === 0) {
    return { startTime: null, endTime: null };
  }

  const startTime = sessions[0].startTime;
  const lastSession = sessions[sessions.length - 1];
  const endTime = lastSession.endTime || lastSession.startTime;

  return { startTime, endTime };
}
