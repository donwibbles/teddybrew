"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  joinCommunitySchema,
  leaveCommunitySchema,
  removeMemberSchema,
} from "@/lib/validations/community";
import { MemberRole, CommunityType } from "@prisma/client";

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

    // Validate input
    const parsed = joinCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId } = parsed.data;

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, type: true },
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

      for (const event of eventsAsCoOrganizer) {
        await tx.event.update({
          where: { id: event.id },
          data: {
            coOrganizers: {
              disconnect: { id: memberToRemove.userId },
            },
          },
        });
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

    return {
      userId,
      isMember: !!membership,
      isOwner: membership?.role === MemberRole.OWNER,
      role: membership?.role ?? null,
    };
  } catch {
    return { userId: null, isMember: false, isOwner: false, role: null };
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
        role: MemberRole | null;
      }
    > = {};

    for (const communityId of communityIds) {
      const membership = membershipMap.get(communityId);
      result[communityId] = {
        userId,
        isMember: !!membership,
        isOwner: membership?.role === MemberRole.OWNER,
        role: membership?.role ?? null,
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
        role: MemberRole | null;
      }
    > = {};

    for (const communityId of communityIds) {
      result[communityId] = {
        userId: null,
        isMember: false,
        isOwner: false,
        role: null,
      };
    }

    return result;
  }
}
