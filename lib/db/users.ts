import "server-only";

import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

/**
 * User database queries
 */

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Get user with their communities
 */
export async function getUserWithCommunities(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedCommunities: {
        orderBy: { createdAt: "desc" },
      },
      memberships: {
        include: {
          community: true,
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });
}

/**
 * Get user with their upcoming events (as organizer or attendee)
 */
export async function getUserWithUpcomingEvents(userId: string) {
  const now = new Date();

  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizedEvents: {
        where: {
          startTime: { gte: now },
        },
        orderBy: { startTime: "asc" },
      },
      rsvps: {
        where: {
          status: "GOING",
          event: {
            startTime: { gte: now },
          },
        },
        include: {
          event: true,
        },
        orderBy: { event: { startTime: "asc" } },
      },
    },
  });
}
