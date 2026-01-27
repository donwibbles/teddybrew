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
import { checkCommunityRateLimit } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/sentry";

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

    // Check rate limit
    const rateLimit = await checkCommunityRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're creating communities too quickly. Please wait before creating another.",
      };
    }

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
    captureServerError("community.create", error);
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

    // Check rate limit
    const rateLimit = await checkCommunityRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're making changes too quickly. Please wait before updating.",
      };
    }

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
    captureServerError("community.update", error);
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
    captureServerError("community.delete", error);
    return { success: false, error: "Failed to delete community" };
  }
}

/**
 * Size filter type for communities
 */
export type SizeFilter = "all" | "small" | "medium" | "large";

/**
 * Sort options for communities
 */
export type SortOption = "recent" | "popular";

/**
 * Get communities for discovery page
 * - Supports search, size filtering, and sorting
 * - Case-insensitive search
 * - By default only shows PUBLIC communities (PRIVATE communities are hidden)
 */
export async function searchCommunities(
  query?: string,
  sizeFilter: SizeFilter = "all",
  sortBy: SortOption = "recent"
) {
  try {
    const trimmedQuery = query?.trim().toLowerCase();

    // SECURITY: Only PUBLIC communities appear in search results.
    // Private communities are discoverable only through direct invitations
    // or user's membership list.
    const communities = await prisma.community.findMany({
      where: {
        AND: [
          // Always PUBLIC only - private communities never appear in search
          { type: "PUBLIC" },
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
      orderBy: sortBy === "popular"
        ? { members: { _count: "desc" } }
        : { createdAt: "desc" },
    });

    // Apply size filter (done in-memory since Prisma doesn't support filtering by count directly)
    let filtered = communities;
    if (sizeFilter !== "all") {
      filtered = communities.filter((c) => {
        const count = c._count.members;
        switch (sizeFilter) {
          case "small":
            return count >= 1 && count <= 10;
          case "medium":
            return count >= 11 && count <= 50;
          case "large":
            return count >= 51;
          default:
            return true;
        }
      });
    }

    return filtered;
  } catch (error) {
    console.error("Failed to search communities:", error);
    captureServerError("community.search", error);
    return [];
  }
}
