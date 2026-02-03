"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { canModerate, logModerationAction } from "@/lib/db/members";
import { getSpotlightedEventCount } from "@/lib/db/communities";
import { spotlightEventSchema } from "@/lib/validations/spotlight";
import { sendNotification } from "@/lib/actions/notification";
import { captureServerError } from "@/lib/sentry";
import type { ActionResult } from "./community";

const MAX_SPOTLIGHTED_EVENTS = 3;

/**
 * Spotlight or unspotlight an event
 * - Only moderators/owners can spotlight events
 * - Maximum 3 events can be spotlighted at a time
 * - Optionally notify community members
 */
export async function spotlightEvent(
  input: unknown
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Validate input
    const parsed = spotlightEventSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { eventId, spotlight, notifyMembers } = parsed.data;

    // Get event with community info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        communityId: true,
        isSpotlighted: true,
        community: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    // Check if user can moderate
    const canMod = await canModerate(userId, event.communityId);
    if (!canMod) {
      return { success: false, error: "You don't have permission to spotlight events" };
    }

    // If spotlighting, check the limit
    if (spotlight && !event.isSpotlighted) {
      const currentCount = await getSpotlightedEventCount(event.communityId);
      if (currentCount >= MAX_SPOTLIGHTED_EVENTS) {
        return {
          success: false,
          error: `Maximum ${MAX_SPOTLIGHTED_EVENTS} events can be spotlighted at a time`,
        };
      }
    }

    // Update the event
    if (spotlight) {
      // Get the highest current order
      const highestOrder = await prisma.event.findFirst({
        where: { communityId: event.communityId, isSpotlighted: true },
        orderBy: { spotlightOrder: "desc" },
        select: { spotlightOrder: true },
      });

      await prisma.event.update({
        where: { id: eventId },
        data: {
          isSpotlighted: true,
          spotlightedAt: new Date(),
          spotlightedById: userId,
          spotlightOrder: (highestOrder?.spotlightOrder ?? 0) + 1,
        },
      });

      // Log moderation action
      await logModerationAction({
        communityId: event.communityId,
        moderatorId: userId,
        action: "SPOTLIGHT_EVENT",
        targetType: "Event",
        targetId: eventId,
        targetTitle: event.title,
      });

      // Notify members if requested
      if (notifyMembers) {
        // Get all community members except the moderator
        const members = await prisma.member.findMany({
          where: {
            communityId: event.communityId,
            userId: { not: userId },
          },
          select: { userId: true },
        });

        // Send notifications in batches
        const notificationPromises = members.map((member) =>
          sendNotification({
            type: "EVENT_SPOTLIGHT",
            userId: member.userId,
            title: `Featured event in ${event.community.name}`,
            message: event.title,
            link: `/communities/${event.community.slug}/events/${eventId}`,
          })
        );

        // Fire and forget - don't block on notifications
        Promise.all(notificationPromises).catch((err) => {
          console.error("Failed to send spotlight notifications:", err);
        });
      }
    } else {
      // Unspotlight
      await prisma.event.update({
        where: { id: eventId },
        data: {
          isSpotlighted: false,
          spotlightedAt: null,
          spotlightedById: null,
          spotlightOrder: 0,
        },
      });

      // Log moderation action
      await logModerationAction({
        communityId: event.communityId,
        moderatorId: userId,
        action: "UNSPOTLIGHT_EVENT",
        targetType: "Event",
        targetId: eventId,
        targetTitle: event.title,
      });
    }

    revalidatePath(`/communities/${event.community.slug}`);
    revalidatePath(`/communities/${event.community.slug}/settings`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to spotlight event:", error);
    captureServerError("spotlight.spotlightEvent", error);
    return { success: false, error: "Failed to update event spotlight" };
  }
}

/**
 * Get spotlighted events for a community (client-callable)
 */
export async function getSpotlightedEventsAction(communityId: string) {
  try {
    return await prisma.event.findMany({
      where: {
        communityId,
        isSpotlighted: true,
        sessions: { some: { startTime: { gte: new Date() } } },
      },
      orderBy: { spotlightOrder: "asc" },
      take: MAX_SPOTLIGHTED_EVENTS,
      select: {
        id: true,
        title: true,
        location: true,
        isVirtual: true,
        timezone: true,
        coverImage: true,
        sessions: {
          where: { startTime: { gte: new Date() } },
          orderBy: { startTime: "asc" },
          take: 1,
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to get spotlighted events:", error);
    return [];
  }
}
