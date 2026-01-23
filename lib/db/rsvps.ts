import "server-only";

import { prisma } from "@/lib/prisma";
import { RSVP, RSVPStatus } from "@prisma/client";

/**
 * RSVP database queries (session-based)
 */

/**
 * Get user's RSVP for a session
 */
export async function getUserSessionRSVP(
  userId: string,
  sessionId: string
): Promise<RSVP | null> {
  return await prisma.rSVP.findUnique({
    where: {
      userId_sessionId: {
        userId,
        sessionId,
      },
    },
  });
}

/**
 * Check if user has RSVP'd to a session
 */
export async function hasSessionRSVP(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const rsvp = await getUserSessionRSVP(userId, sessionId);
  return !!rsvp;
}

/**
 * Check if user is going to a session
 */
export async function isUserGoingToSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const rsvp = await getUserSessionRSVP(userId, sessionId);
  return rsvp?.status === RSVPStatus.GOING;
}

/**
 * Get all RSVPs for a session
 */
export async function getSessionRSVPs(sessionId: string) {
  return await prisma.rSVP.findMany({
    where: { sessionId },
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
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get GOING RSVPs for a session
 */
export async function getGoingSessionRSVPs(sessionId: string) {
  return await prisma.rSVP.findMany({
    where: {
      sessionId,
      status: RSVPStatus.GOING,
    },
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
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get count of GOING RSVPs for a session
 */
export async function getSessionGoingCount(sessionId: string): Promise<number> {
  return await prisma.rSVP.count({
    where: {
      sessionId,
      status: RSVPStatus.GOING,
    },
  });
}

/**
 * Get user's RSVPs for an event (across all sessions)
 */
export async function getUserEventRSVPs(userId: string, eventId: string) {
  return await prisma.rSVP.findMany({
    where: {
      userId,
      status: RSVPStatus.GOING,
      session: { eventId },
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });
}

/**
 * Check if user is attending any session of an event
 */
export async function isUserAttendingEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const count = await prisma.rSVP.count({
    where: {
      userId,
      status: RSVPStatus.GOING,
      session: { eventId },
    },
  });
  return count > 0;
}

/**
 * Get user's upcoming RSVPs (sessions in the future)
 */
export async function getUserUpcomingRSVPs(userId: string) {
  const now = new Date();
  return await prisma.rSVP.findMany({
    where: {
      userId,
      status: RSVPStatus.GOING,
      session: {
        startTime: { gte: now },
      },
    },
    include: {
      session: {
        include: {
          event: {
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
            },
          },
        },
      },
    },
    orderBy: { session: { startTime: "asc" } },
  });
}

/**
 * Get user's past RSVPs (sessions in the past)
 */
export async function getUserPastRSVPs(userId: string) {
  const now = new Date();
  return await prisma.rSVP.findMany({
    where: {
      userId,
      status: RSVPStatus.GOING,
      session: {
        startTime: { lt: now },
      },
    },
    include: {
      session: {
        include: {
          event: {
            include: {
              community: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { session: { startTime: "desc" } },
  });
}

/**
 * Get unique attendee count for an event (across all sessions)
 */
export async function getEventAttendeeCount(eventId: string): Promise<number> {
  const rsvps = await prisma.rSVP.findMany({
    where: {
      status: RSVPStatus.GOING,
      session: { eventId },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rsvps.length;
}
