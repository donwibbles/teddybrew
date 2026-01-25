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
          sessions: { some: { startTime: { gte: now } } },
        },
        include: {
          sessions: {
            orderBy: { startTime: "asc" },
          },
        },
      },
      rsvps: {
        where: {
          status: "GOING",
          session: {
            startTime: { gte: now },
          },
        },
        include: {
          session: {
            include: {
              event: true,
            },
          },
        },
        orderBy: { session: { startTime: "asc" } },
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
        session: { startTime: { gte: now } },
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
  data: {
    firstName?: string;
    lastName?: string;
    name?: string;
    username?: string;
    bio?: string | null;
    interests?: string | null;
    communityHope?: string | null;
    isPublic?: boolean;
  }
): Promise<User> {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      name: data.name,
      username: data.username,
      bio: data.bio,
      interests: data.interests,
      communityHope: data.communityHope,
      // SECURITY: Only update isPublic if explicitly provided
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      updatedAt: new Date(),
    },
  });
}

/**
 * Public profile data type
 */
export type PublicProfile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  interests: string | null;
  communityHope: string | null;
  isPublic: boolean;
  createdAt: Date;
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    memberCount: number;
  }>;
};

/**
 * Get user public profile by username
 * Returns null if user not found
 */
export async function getUserPublicProfile(username: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      interests: true,
      communityHope: true,
      isPublic: true,
      createdAt: true,
      memberships: {
        where: {
          community: {
            type: "PUBLIC",
          },
        },
        include: {
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              _count: {
                select: { members: true },
              },
            },
          },
        },
        take: 10,
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.image,
    bio: user.bio,
    interests: user.interests,
    communityHope: user.communityHope,
    isPublic: user.isPublic,
    createdAt: user.createdAt,
    communities: user.memberships.map((m) => ({
      id: m.community.id,
      name: m.community.name,
      slug: m.community.slug,
      description: m.community.description,
      memberCount: m.community._count.members,
    })),
  };
}
