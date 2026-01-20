import "server-only";

import { prisma } from "@/lib/prisma";
import { RSVP, RSVPStatus } from "@prisma/client";

/**
 * RSVP database queries
 */

/**
 * Get user's RSVP for an event
 */
export async function getUserRSVP(
  userId: string,
  eventId: string
): Promise<RSVP | null> {
  return await prisma.rSVP.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });
}

/**
 * Check if user has RSVP'd to an event
 */
export async function hasRSVP(userId: string, eventId: string): Promise<boolean> {
  const rsvp = await getUserRSVP(userId, eventId);
  return !!rsvp;
}

/**
 * Check if user is going to an event
 */
export async function isUserGoing(
  userId: string,
  eventId: string
): Promise<boolean> {
  const rsvp = await getUserRSVP(userId, eventId);
  return rsvp?.status === RSVPStatus.GOING;
}

/**
 * Get all RSVPs for an event
 */
export async function getEventRSVPs(eventId: string) {
  return await prisma.rSVP.findMany({
    where: { eventId },
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
 * Get GOING RSVPs for an event
 */
export async function getGoingRSVPs(eventId: string) {
  return await prisma.rSVP.findMany({
    where: {
      eventId,
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
 * Get count of GOING RSVPs for an event
 */
export async function getGoingCount(eventId: string): Promise<number> {
  return await prisma.rSVP.count({
    where: {
      eventId,
      status: RSVPStatus.GOING,
    },
  });
}

/**
 * Get user's upcoming RSVPs
 */
export async function getUserUpcomingRSVPs(userId: string) {
  const now = new Date();
  return await prisma.rSVP.findMany({
    where: {
      userId,
      status: RSVPStatus.GOING,
      event: {
        startTime: { gte: now },
      },
    },
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
    orderBy: { event: { startTime: "asc" } },
  });
}

/**
 * Get user's past RSVPs
 */
export async function getUserPastRSVPs(userId: string) {
  const now = new Date();
  return await prisma.rSVP.findMany({
    where: {
      userId,
      status: RSVPStatus.GOING,
      event: {
        startTime: { lt: now },
      },
    },
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
    orderBy: { event: { startTime: "desc" } },
  });
}
