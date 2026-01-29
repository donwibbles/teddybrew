import "server-only";

import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import type { Member } from "@prisma/client";

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
 * Check if user is a moderator of a community (MODERATOR role only, not OWNER)
 */
export async function isModerator(
  userId: string,
  communityId: string
): Promise<boolean> {
  const role = await getMemberRole(userId, communityId);
  return role === MemberRole.MODERATOR;
}

/**
 * Check if user can moderate content (OWNER or MODERATOR)
 * Use this for delete/pin actions
 */
export async function canModerate(
  userId: string,
  communityId: string
): Promise<boolean> {
  const role = await getMemberRole(userId, communityId);
  return role === MemberRole.OWNER || role === MemberRole.MODERATOR;
}

/**
 * Get full membership permissions in a single query
 * Useful to avoid multiple queries when checking multiple permissions
 */
export async function getMemberPermissions(
  userId: string,
  communityId: string
): Promise<{
  role: MemberRole | null;
  isMember: boolean;
  isOwner: boolean;
  isModerator: boolean;
  canModerate: boolean;
}> {
  const role = await getMemberRole(userId, communityId);
  return {
    role,
    isMember: role !== null,
    isOwner: role === MemberRole.OWNER,
    isModerator: role === MemberRole.MODERATOR,
    canModerate: role === MemberRole.OWNER || role === MemberRole.MODERATOR,
  };
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
export async function getCommunityMembers(
  communityId: string,
  limit: number = 100
) {
  return await prisma.member.findMany({
    where: { communityId },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          username: true,
          isPublic: true,
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
    take: 100,
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

/**
 * Log a moderation action
 */
export async function logModerationAction(params: {
  communityId: string;
  moderatorId: string;
  action: "DELETE_POST" | "DELETE_COMMENT" | "DELETE_MESSAGE" | "PIN_POST" | "UNPIN_POST" | "DELETE_DOCUMENT" | "ARCHIVE_DOCUMENT" | "PIN_DOCUMENT" | "UNPIN_DOCUMENT";
  targetType: "Post" | "Comment" | "Message" | "Document";
  targetId: string;
  targetTitle?: string;
}) {
  return await prisma.moderationLog.create({
    data: {
      communityId: params.communityId,
      moderatorId: params.moderatorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      targetTitle: params.targetTitle,
    },
  });
}

/**
 * Get moderation logs for a community
 */
export async function getModerationLogs(
  communityId: string,
  options?: { limit?: number; cursor?: string }
) {
  const limit = options?.limit ?? 50;

  return await prisma.moderationLog.findMany({
    where: { communityId },
    take: limit + 1,
    cursor: options?.cursor ? { id: options.cursor } : undefined,
    skip: options?.cursor ? 1 : 0,
    orderBy: { createdAt: "desc" },
    include: {
      moderator: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });
}
