"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  joinCommunitySchema,
  leaveCommunitySchema,
  removeMemberSchema,
  promoteMemberSchema,
  demoteMemberSchema,
} from "@/lib/validations/community";
import { MemberRole, CommunityType, NotificationType } from "@prisma/client";
import { checkMembershipRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "./notification";
import { canModerate as canModerateDb, getModerationLogs as getModerationLogsDb } from "@/lib/db/members";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Join a community
 * - Public communities: anyone can join
 * - Private communities: currently not joinable (future: invite system)
 * - Cannot join if already a member
 */
export async function joinCommunity(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkMembershipRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're joining communities too quickly. Please wait before joining another.",
      };
    }

    // Validate input
    const parsed = joinCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId } = parsed.data;

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, name: true, type: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if community is private
    if (community.type === CommunityType.PRIVATE) {
      return {
        success: false,
        error: "This is a private community. You need an invitation to join.",
      };
    }

    // Check if already a member
    const existingMembership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      select: { id: true },
    });

    if (existingMembership) {
      return { success: false, error: "You are already a member of this community" };
    }

    // Create membership
    await prisma.member.create({
      data: {
        userId,
        communityId,
        role: MemberRole.MEMBER,
      },
    });

    // Update community lastActivityAt (fire and forget)
    prisma.community.update({
      where: { id: communityId },
      data: { lastActivityAt: new Date() },
    }).catch((err) => console.warn("Failed to update lastActivityAt:", err));

    // Get joining user's name for notification
    const joiningUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Notify community owner
    sendNotification({
      type: NotificationType.NEW_MEMBER,
      userId: community.ownerId,
      title: `New member in ${community.name}`,
      message: `${joiningUser?.name || "Someone"} joined your community`,
      link: `/communities/${community.slug}/members`,
    }).catch((err) => console.warn("Failed to send notification:", err));

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath("/communities");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to join community:", error);
    return { success: false, error: "Failed to join community" };
  }
}

/**
 * Leave a community
 * - Owner cannot leave (must transfer ownership or delete community)
 * - Regular members can leave freely
 */
export async function leaveCommunity(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkMembershipRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're making membership changes too quickly. Please wait.",
      };
    }

    // Validate input
    const parsed = leaveCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId } = parsed.data;

    // Get community and membership
    const [community, membership] = await Promise.all([
      prisma.community.findUnique({
        where: { id: communityId },
        select: { id: true, slug: true, ownerId: true },
      }),
      prisma.member.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId,
          },
        },
        select: { id: true, role: true },
      }),
    ]);

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    if (!membership) {
      return { success: false, error: "You are not a member of this community" };
    }

    // Check if user is the owner
    if (membership.role === MemberRole.OWNER) {
      return {
        success: false,
        error:
          "As the owner, you cannot leave the community. You must transfer ownership or delete the community.",
      };
    }

    // Delete membership (events organized by user remain but may need handling in future)
    await prisma.member.delete({
      where: { id: membership.id },
    });

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath("/communities");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to leave community:", error);
    return { success: false, error: "Failed to leave community" };
  }
}

/**
 * Remove a member from a community
 * - Only owner can remove members
 * - Cannot remove the owner
 * - Transfers event ownership of removed member's events to the remover (owner)
 */
export async function removeMember(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = removeMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, memberId } = parsed.data;

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if current user is the owner
    if (community.ownerId !== userId) {
      return {
        success: false,
        error: "Only the community owner can remove members",
      };
    }

    // Get the member to be removed
    const memberToRemove = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true, role: true, communityId: true },
    });

    if (!memberToRemove) {
      return { success: false, error: "Member not found" };
    }

    // Verify member belongs to this community
    if (memberToRemove.communityId !== communityId) {
      return { success: false, error: "Member does not belong to this community" };
    }

    // Cannot remove the owner
    if (memberToRemove.role === MemberRole.OWNER) {
      return { success: false, error: "Cannot remove the community owner" };
    }

    // Transfer event ownership and remove member in a transaction
    await prisma.$transaction(async (tx) => {
      // Transfer all events organized by this member to the owner (removing user)
      await tx.event.updateMany({
        where: {
          communityId,
          organizerId: memberToRemove.userId,
        },
        data: {
          organizerId: userId, // Transfer to the owner who is removing
        },
      });

      // Remove member from co-organizers of any events
      const eventsAsCoOrganizer = await tx.event.findMany({
        where: {
          communityId,
          coOrganizers: {
            some: { id: memberToRemove.userId },
          },
        },
        select: { id: true },
      });

      // Execute all disconnects in parallel (still N queries, but parallel)
      if (eventsAsCoOrganizer.length > 0) {
        await Promise.all(
          eventsAsCoOrganizer.map((event) =>
            tx.event.update({
              where: { id: event.id },
              data: {
                coOrganizers: {
                  disconnect: { id: memberToRemove.userId },
                },
              },
            })
          )
        );
      }

      // Delete the membership
      await tx.member.delete({
        where: { id: memberId },
      });
    });

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath(`/communities/${community.slug}/members`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}

/**
 * Promote a member to moderator
 * - Only owner can promote members
 * - Cannot promote owner or already-moderator
 * - Cannot promote self
 */
export async function promoteMember(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = promoteMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, memberId } = parsed.data;

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if current user is the owner
    if (community.ownerId !== userId) {
      return {
        success: false,
        error: "Only the community owner can promote members",
      };
    }

    // Get the member to be promoted
    const memberToPromote = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true, role: true, communityId: true },
    });

    if (!memberToPromote) {
      return { success: false, error: "User must be a community member" };
    }

    // Verify member belongs to this community
    if (memberToPromote.communityId !== communityId) {
      return { success: false, error: "Member does not belong to this community" };
    }

    // Cannot promote self
    if (memberToPromote.userId === userId) {
      return { success: false, error: "Cannot change your own role" };
    }

    // Cannot promote owner (check both role and ownerId)
    if (memberToPromote.role === MemberRole.OWNER || memberToPromote.userId === community.ownerId) {
      return { success: false, error: "Cannot change the owner's role" };
    }

    // Cannot promote already-moderator
    if (memberToPromote.role === MemberRole.MODERATOR) {
      return { success: false, error: "Member is already a moderator" };
    }

    // Promote to moderator
    await prisma.member.update({
      where: { id: memberId },
      data: { role: MemberRole.MODERATOR },
    });

    revalidatePath(`/communities/${community.slug}/members`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to promote member:", error);
    return { success: false, error: "Failed to promote member" };
  }
}

/**
 * Demote a moderator to member
 * - Only owner can demote moderators
 * - Cannot demote owner or non-moderator
 * - Cannot demote self
 */
export async function demoteMember(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = demoteMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, memberId } = parsed.data;

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if current user is the owner
    if (community.ownerId !== userId) {
      return {
        success: false,
        error: "Only the community owner can demote moderators",
      };
    }

    // Get the member to be demoted
    const memberToDemote = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, userId: true, role: true, communityId: true },
    });

    if (!memberToDemote) {
      return { success: false, error: "Member not found" };
    }

    // Verify member belongs to this community
    if (memberToDemote.communityId !== communityId) {
      return { success: false, error: "Member does not belong to this community" };
    }

    // Cannot demote self
    if (memberToDemote.userId === userId) {
      return { success: false, error: "Cannot change your own role" };
    }

    // Cannot demote owner
    if (memberToDemote.role === MemberRole.OWNER || memberToDemote.userId === community.ownerId) {
      return { success: false, error: "Cannot change the owner's role" };
    }

    // Can only demote moderators
    if (memberToDemote.role !== MemberRole.MODERATOR) {
      return { success: false, error: "User is not a moderator" };
    }

    // Demote to member
    await prisma.member.update({
      where: { id: memberId },
      data: { role: MemberRole.MEMBER },
    });

    revalidatePath(`/communities/${community.slug}/members`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to demote member:", error);
    return { success: false, error: "Failed to demote member" };
  }
}

/**
 * Get user's membership status for a community
 */
export async function getMembershipStatus(communityId: string) {
  try {
    const { userId } = await verifySession();

    const membership = await prisma.member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      select: { role: true },
    });

    const role = membership?.role ?? null;
    const isOwner = role === MemberRole.OWNER;
    const isModerator = role === MemberRole.MODERATOR;

    return {
      userId,
      isMember: !!membership,
      isOwner,
      isModerator,
      canModerate: isOwner || isModerator,
      role,
    };
  } catch {
    return {
      userId: null,
      isMember: false,
      isOwner: false,
      isModerator: false,
      canModerate: false,
      role: null,
    };
  }
}

/**
 * Get user's membership status for multiple communities in a single query
 * Returns a map of communityId -> membership status
 */
export async function getBatchMembershipStatus(communityIds: string[]) {
  try {
    const { userId } = await verifySession();

    const memberships = await prisma.member.findMany({
      where: {
        userId,
        communityId: { in: communityIds },
      },
      select: { communityId: true, role: true },
    });

    // Build a map of communityId -> membership
    const membershipMap = new Map(
      memberships.map((m) => [m.communityId, m])
    );

    // Return a map of communityId -> status
    const result: Record<
      string,
      {
        userId: string | null;
        isMember: boolean;
        isOwner: boolean;
        isModerator: boolean;
        canModerate: boolean;
        role: MemberRole | null;
      }
    > = {};

    for (const communityId of communityIds) {
      const membership = membershipMap.get(communityId);
      const role = membership?.role ?? null;
      const isOwner = role === MemberRole.OWNER;
      const isModerator = role === MemberRole.MODERATOR;
      result[communityId] = {
        userId,
        isMember: !!membership,
        isOwner,
        isModerator,
        canModerate: isOwner || isModerator,
        role,
      };
    }

    return result;
  } catch {
    // Return empty memberships for all communities if not authenticated
    const result: Record<
      string,
      {
        userId: string | null;
        isMember: boolean;
        isOwner: boolean;
        isModerator: boolean;
        canModerate: boolean;
        role: MemberRole | null;
      }
    > = {};

    for (const communityId of communityIds) {
      result[communityId] = {
        userId: null,
        isMember: false,
        isOwner: false,
        isModerator: false,
        canModerate: false,
        role: null,
      };
    }

    return result;
  }
}

/**
 * Get moderation logs for a community
 * Only accessible to owners and moderators
 */
export async function getModerationLogs(communityId: string, cursor?: string) {
  try {
    const { userId } = await verifySession();

    // Check if user can moderate this community
    if (!(await canModerateDb(userId, communityId))) {
      return { logs: [], nextCursor: undefined, hasMore: false };
    }

    const limit = 20;
    const logs = await getModerationLogsDb(communityId, { limit, cursor });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, -1) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      logs: items,
      nextCursor,
      hasMore,
    };
  } catch {
    return { logs: [], nextCursor: undefined, hasMore: false };
  }
}
