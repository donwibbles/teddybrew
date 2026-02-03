"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { canModerate, logModerationAction } from "@/lib/db/members";
import { getActiveAnnouncementCount } from "@/lib/db/announcements";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  deleteAnnouncementSchema,
} from "@/lib/validations/announcement";
import { sendNotification } from "@/lib/actions/notification";
import { sanitizeText } from "@/lib/utils/sanitize";
import { captureServerError } from "@/lib/sentry";
import type { ActionResult } from "./community";

const MAX_ACTIVE_ANNOUNCEMENTS = 2;

/**
 * Create a new announcement
 * - Only moderators/owners can create announcements
 * - Maximum 2 active announcements at a time
 * - Always notifies community members
 */
export async function createAnnouncement(
  input: unknown
): Promise<ActionResult<{ announcementId: string }>> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = createAnnouncementSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, title, content } = parsed.data;

    // Get community info
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, slug: true, name: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if user can moderate
    const canMod = await canModerate(userId, communityId);
    if (!canMod) {
      return { success: false, error: "You don't have permission to create announcements" };
    }

    // Check the limit
    const currentCount = await getActiveAnnouncementCount(communityId);
    if (currentCount >= MAX_ACTIVE_ANNOUNCEMENTS) {
      return {
        success: false,
        error: `Maximum ${MAX_ACTIVE_ANNOUNCEMENTS} active announcements allowed. Please deactivate or delete an existing announcement first.`,
      };
    }

    // Sanitize content
    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);

    // Get the highest current sort order
    const highestOrder = await prisma.announcement.findFirst({
      where: { communityId, isActive: true },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // Create the announcement
    const announcement = await prisma.announcement.create({
      data: {
        communityId,
        title: sanitizedTitle,
        content: sanitizedContent,
        createdById: userId,
        sortOrder: (highestOrder?.sortOrder ?? 0) + 1,
      },
    });

    // Log moderation action
    await logModerationAction({
      communityId,
      moderatorId: userId,
      action: "CREATE_ANNOUNCEMENT",
      targetType: "Announcement",
      targetId: announcement.id,
      targetTitle: sanitizedTitle,
    });

    // Notify all community members (except creator)
    const members = await prisma.member.findMany({
      where: {
        communityId,
        userId: { not: userId },
      },
      select: { userId: true },
    });

    // Send notifications in batches
    const notificationPromises = members.map((member) =>
      sendNotification({
        type: "ANNOUNCEMENT",
        userId: member.userId,
        title: `New announcement in ${community.name}`,
        message: sanitizedTitle,
        link: `/communities/${community.slug}`,
      })
    );

    // Fire and forget - don't block on notifications
    Promise.all(notificationPromises).catch((err) => {
      console.error("Failed to send announcement notifications:", err);
    });

    revalidatePath(`/communities/${community.slug}`);
    revalidatePath(`/communities/${community.slug}/settings`);

    return { success: true, data: { announcementId: announcement.id } };
  } catch (error) {
    console.error("Failed to create announcement:", error);
    captureServerError("announcement.create", error);
    return { success: false, error: "Failed to create announcement" };
  }
}

/**
 * Update an announcement
 * - Only moderators/owners can update announcements
 */
export async function updateAnnouncement(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = updateAnnouncementSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { announcementId, title, content, isActive } = parsed.data;

    // Get announcement with community info
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        title: true,
        communityId: true,
        isActive: true,
        community: {
          select: { slug: true },
        },
      },
    });

    if (!announcement) {
      return { success: false, error: "Announcement not found" };
    }

    // Check if user can moderate
    const canMod = await canModerate(userId, announcement.communityId);
    if (!canMod) {
      return { success: false, error: "You don't have permission to update announcements" };
    }

    // If activating, check the limit
    if (isActive === true && !announcement.isActive) {
      const currentCount = await getActiveAnnouncementCount(announcement.communityId);
      if (currentCount >= MAX_ACTIVE_ANNOUNCEMENTS) {
        return {
          success: false,
          error: `Maximum ${MAX_ACTIVE_ANNOUNCEMENTS} active announcements allowed`,
        };
      }
    }

    // Sanitize content if provided
    const sanitizedTitle = title ? sanitizeText(title) : undefined;
    const sanitizedContent = content ? sanitizeText(content) : undefined;

    // Update the announcement
    await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(sanitizedTitle && { title: sanitizedTitle }),
        ...(sanitizedContent && { content: sanitizedContent }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Log moderation action
    await logModerationAction({
      communityId: announcement.communityId,
      moderatorId: userId,
      action: "UPDATE_ANNOUNCEMENT",
      targetType: "Announcement",
      targetId: announcementId,
      targetTitle: sanitizedTitle || announcement.title,
    });

    revalidatePath(`/communities/${announcement.community.slug}`);
    revalidatePath(`/communities/${announcement.community.slug}/settings`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update announcement:", error);
    captureServerError("announcement.update", error);
    return { success: false, error: "Failed to update announcement" };
  }
}

/**
 * Delete an announcement
 * - Only moderators/owners can delete announcements
 */
export async function deleteAnnouncement(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = deleteAnnouncementSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { announcementId } = parsed.data;

    // Get announcement with community info
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        title: true,
        communityId: true,
        community: {
          select: { slug: true },
        },
      },
    });

    if (!announcement) {
      return { success: false, error: "Announcement not found" };
    }

    // Check if user can moderate
    const canMod = await canModerate(userId, announcement.communityId);
    if (!canMod) {
      return { success: false, error: "You don't have permission to delete announcements" };
    }

    // Log moderation action before deletion
    await logModerationAction({
      communityId: announcement.communityId,
      moderatorId: userId,
      action: "DELETE_ANNOUNCEMENT",
      targetType: "Announcement",
      targetId: announcementId,
      targetTitle: announcement.title,
    });

    // Delete the announcement
    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    revalidatePath(`/communities/${announcement.community.slug}`);
    revalidatePath(`/communities/${announcement.community.slug}/settings`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    captureServerError("announcement.delete", error);
    return { success: false, error: "Failed to delete announcement" };
  }
}

/**
 * Get announcements for a community (client-callable)
 */
export async function getAnnouncementsAction(communityId: string) {
  try {
    return await prisma.announcement.findMany({
      where: {
        communityId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to get announcements:", error);
    return [];
  }
}
