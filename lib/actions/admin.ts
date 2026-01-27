"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { isAdmin } from "@/lib/admin";
import { z } from "zod";
import { MemberRole } from "@prisma/client";
import { captureServerError } from "@/lib/sentry";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Delete a community as admin
 */
const adminDeleteCommunitySchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  reason: z.string().min(1, "Reason is required"),
});

export async function adminDeleteCommunity(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Verify admin
    if (!(await isAdmin(userId))) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = adminDeleteCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, reason } = parsed.data;

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true, slug: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Log the action
    console.log(
      `[ADMIN] User ${userId} deleted community ${community.name} (${communityId}). Reason: ${reason}`
    );

    // Delete community (cascades to all related data)
    await prisma.community.delete({
      where: { id: communityId },
    });

    revalidatePath("/admin/communities");
    revalidatePath("/communities");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete community:", error);
    captureServerError("admin.deleteCommunity", error);
    return { success: false, error: "Failed to delete community" };
  }
}

/**
 * Transfer ownership of a community as admin
 */
const adminTransferOwnershipSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  newOwnerId: z.string().min(1, "New owner ID is required"),
  reason: z.string().min(1, "Reason is required"),
});

export async function adminTransferOwnership(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Verify admin
    if (!(await isAdmin(userId))) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = adminTransferOwnershipSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, newOwnerId, reason } = parsed.data;

    // Get community with current owner
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true, slug: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: newOwnerId },
      select: { id: true, name: true },
    });

    if (!newOwner) {
      return { success: false, error: "New owner not found" };
    }

    // Log the action
    console.log(
      `[ADMIN] User ${userId} transferred ownership of community ${community.name} (${communityId}) to ${newOwner.name || newOwnerId}. Reason: ${reason}`
    );

    await prisma.$transaction(async (tx) => {
      // Check if new owner is already a member
      const existingMembership = await tx.member.findUnique({
        where: {
          userId_communityId: {
            userId: newOwnerId,
            communityId,
          },
        },
      });

      // If new owner is not a member, create membership
      if (!existingMembership) {
        await tx.member.create({
          data: {
            userId: newOwnerId,
            communityId,
            role: MemberRole.OWNER,
          },
        });
      } else {
        // Update new owner's role to OWNER
        await tx.member.update({
          where: {
            userId_communityId: {
              userId: newOwnerId,
              communityId,
            },
          },
          data: { role: MemberRole.OWNER },
        });
      }

      // Demote old owner to MEMBER
      await tx.member.update({
        where: {
          userId_communityId: {
            userId: community.ownerId,
            communityId,
          },
        },
        data: { role: MemberRole.MEMBER },
      });

      // Update community owner
      await tx.community.update({
        where: { id: communityId },
        data: { ownerId: newOwnerId },
      });
    });

    revalidatePath("/admin/communities");
    revalidatePath(`/communities/${community.slug}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to transfer ownership:", error);
    captureServerError("admin.transferOwnership", error);
    return { success: false, error: "Failed to transfer ownership" };
  }
}

/**
 * Get all communities for admin dashboard
 */
export async function getAdminCommunities() {
  try {
    const { userId } = await verifySession();

    if (!(await isAdmin(userId))) {
      return [];
    }

    return await prisma.community.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, events: true, posts: true },
        },
      },
    });
  } catch {
    return [];
  }
}

/**
 * Get all users for admin dashboard
 */
export async function getAdminUsers() {
  try {
    const { userId } = await verifySession();

    if (!(await isAdmin(userId))) {
      return [];
    }

    return await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: { memberships: true, posts: true, comments: true },
        },
      },
    });
  } catch {
    return [];
  }
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats() {
  try {
    const { userId } = await verifySession();

    if (!(await isAdmin(userId))) {
      return null;
    }

    const [userCount, communityCount, postCount, eventCount] = await Promise.all([
      prisma.user.count(),
      prisma.community.count(),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.event.count(),
    ]);

    return {
      userCount,
      communityCount,
      postCount,
      eventCount,
    };
  } catch {
    return null;
  }
}
