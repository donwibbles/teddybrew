"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  createCommunitySchema,
  updateCommunitySchema,
  deleteCommunitySchema,
} from "@/lib/validations/community";
import { MemberRole } from "@prisma/client";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a new community
 * - User becomes owner automatically
 * - Slug must be unique
 */
export async function createCommunity(
  input: unknown
): Promise<ActionResult<{ slug: string }>> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = createCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { name, slug, description, type } = parsed.data;

    // Sanitize description
    const sanitizedDescription = description
      ? sanitizeText(description)
      : undefined;

    // Check if slug is already taken
    const existingCommunity = await prisma.community.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingCommunity) {
      return { success: false, error: "This URL slug is already taken" };
    }

    // Create community and add owner as member in a transaction
    const community = await prisma.$transaction(async (tx) => {
      // Create the community
      const newCommunity = await tx.community.create({
        data: {
          name,
          slug,
          description: sanitizedDescription,
          type,
          ownerId: userId,
        },
      });

      // Add owner as a member with OWNER role
      await tx.member.create({
        data: {
          userId,
          communityId: newCommunity.id,
          role: MemberRole.OWNER,
        },
      });

      // Create default #general chat channel
      await tx.chatChannel.create({
        data: {
          name: "general",
          description: "General discussion",
          communityId: newCommunity.id,
          isDefault: true,
        },
      });

      return newCommunity;
    });

    revalidatePath("/communities");
    return { success: true, data: { slug: community.slug } };
  } catch (error) {
    console.error("Failed to create community:", error);
    return { success: false, error: "Failed to create community" };
  }
}

/**
 * Update a community
 * - Only owner can update
 * - Slug cannot be changed (immutable)
 */
export async function updateCommunity(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = updateCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, name, description, type } = parsed.data;

    // Get community and check ownership
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    if (community.ownerId !== userId) {
      return {
        success: false,
        error: "Only the community owner can edit settings",
      };
    }

    // Sanitize description
    const sanitizedDescription =
      description !== undefined ? sanitizeText(description) : undefined;

    // Update community
    await prisma.community.update({
      where: { id: communityId },
      data: {
        ...(name && { name }),
        ...(sanitizedDescription !== undefined && {
          description: sanitizedDescription || null,
        }),
        ...(type && { type }),
      },
    });

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath(`/communities/${community.slug}/settings`);
    revalidatePath("/communities");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update community:", error);
    return { success: false, error: "Failed to update community" };
  }
}

/**
 * Delete a community
 * - Only owner can delete
 * - Requires typing community name for confirmation
 * - Cascades to delete all events and memberships
 */
export async function deleteCommunity(
  input: unknown
): Promise<ActionResult> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = deleteCommunitySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, confirmName } = parsed.data;

    // Get community and check ownership
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true, ownerId: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    if (community.ownerId !== userId) {
      return {
        success: false,
        error: "Only the community owner can delete the community",
      };
    }

    // Verify confirmation name matches
    if (confirmName.trim().toLowerCase() !== community.name.toLowerCase()) {
      return {
        success: false,
        error: "Community name does not match. Please type the exact name.",
      };
    }

    // Delete community (cascades to members and events via schema)
    await prisma.community.delete({
      where: { id: communityId },
    });

    revalidatePath("/communities");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete community:", error);
    return { success: false, error: "Failed to delete community" };
  }
}

/**
 * Get communities for discovery page
 * - Supports search and filtering
 * - Case-insensitive search
 * - By default only shows PUBLIC communities (PRIVATE communities are hidden unless explicitly filtered)
 */
export async function searchCommunities(query?: string, typeFilter?: string) {
  try {
    const trimmedQuery = query?.trim().toLowerCase();

    // Default to PUBLIC only if no filter specified or if "ALL" is selected
    // This prevents leaking private community existence/metadata
    const effectiveTypeFilter = typeFilter === "PRIVATE" ? "PRIVATE" : "PUBLIC";

    const communities = await prisma.community.findMany({
      where: {
        AND: [
          // Type filter - defaults to PUBLIC to hide private communities
          { type: effectiveTypeFilter },
          // Search query (case-insensitive)
          trimmedQuery
            ? {
                OR: [
                  { name: { contains: trimmedQuery, mode: "insensitive" } },
                  {
                    description: {
                      contains: trimmedQuery,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {},
        ],
      },
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
      orderBy: { createdAt: "desc" },
    });

    return communities;
  } catch (error) {
    console.error("Failed to search communities:", error);
    return [];
  }
}
