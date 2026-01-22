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

/**
 * Get user dashboard stats
 */
export async function getUserDashboardStats(userId: string) {
  const now = new Date();

  const [
    communitiesOwned,
    communitiesJoined,
    eventsOrganized,
    upcomingRsvps,
  ] = await Promise.all([
    prisma.community.count({ where: { ownerId: userId } }),
    prisma.member.count({ where: { userId } }),
    prisma.event.count({ where: { organizerId: userId } }),
    prisma.rSVP.count({
      where: {
        userId,
        status: "GOING",
        event: { startTime: { gte: now } },
      },
    }),
  ]);

  return {
    communitiesOwned,
    communitiesJoined,
    eventsOrganized,
    upcomingRsvps,
  };
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { username },
  });
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) return true;
  if (excludeUserId && user.id === excludeUserId) return true;
  return false;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; username?: string }
): Promise<User> {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      username: data.username,
      updatedAt: new Date(),
    },
  });
}
