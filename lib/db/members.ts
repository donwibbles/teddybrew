import "server-only";

import { prisma } from "@/lib/prisma";
import { Member, MemberRole } from "@prisma/client";

/**
 * Member/Membership database queries
 */

/**
 * Check if user is a member of a community
 */
export async function isMember(
  userId: string,
  communityId: string
): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
    select: { id: true },
  });
  return !!member;
}

/**
 * Get member role in a community
 */
export async function getMemberRole(
  userId: string,
  communityId: string
): Promise<MemberRole | null> {
  const member = await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
    select: { role: true },
  });
  return member?.role ?? null;
}

/**
 * Check if user is the owner of a community
 */
export async function isOwner(
  userId: string,
  communityId: string
): Promise<boolean> {
  const role = await getMemberRole(userId, communityId);
  return role === MemberRole.OWNER;
}

/**
 * Get member details
 */
export async function getMember(
  userId: string,
  communityId: string
): Promise<Member | null> {
  return await prisma.member.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId,
      },
    },
  });
}

/**
 * Get all members of a community
 */
export async function getCommunityMembers(communityId: string) {
  return await prisma.member.findMany({
    where: { communityId },
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
    orderBy: [{ role: "desc" }, { joinedAt: "desc" }],
  });
}

/**
 * Get member count for a community
 */
export async function getMemberCount(communityId: string): Promise<number> {
  return await prisma.member.count({
    where: { communityId },
  });
}

/**
 * Get user's memberships with community details
 */
export async function getUserMemberships(userId: string) {
  return await prisma.member.findMany({
    where: { userId },
    include: {
      community: {
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
      },
    },
    orderBy: { joinedAt: "desc" },
  });
}
