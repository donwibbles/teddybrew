"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { toggleReactionSchema } from "@/lib/validations/reaction";
import { publishToChannel, getChatChannelName } from "@/lib/ably";
import { checkReactionRateLimit } from "@/lib/rate-limit";
import { verifyChannelAccess } from "./chat";
import type { ActionResult } from "./community";

/**
 * Toggle a reaction on a message (add or remove)
 * Returns server-calculated reaction counts
 */
export async function toggleReaction(
  input: unknown
): Promise<ActionResult<{ counts: Record<string, number> }>> {
  try {
    const { userId } = await verifySession();

    const parsed = toggleReactionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { messageId, emoji } = parsed.data;

    // Rate limit check
    const rateLimit = await checkReactionRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "Too many reactions. Please slow down." };
    }

    // Get message with channel info for authorization
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        deletedAt: true,
        channelId: true,
        channel: {
          select: {
            communityId: true,
          },
        },
      },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.deletedAt) {
      return { success: false, error: "Cannot react to deleted message" };
    }

    // Authorization: Check access to this channel (includes RSVP check for event channels)
    const accessCheck = await verifyChannelAccess(message.channelId, userId);
    if (!accessCheck.hasAccess) {
      return { success: false, error: accessCheck.error || "Access denied" };
    }

    // Toggle reaction (add or remove)
    const existing = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    if (existing) {
      await prisma.messageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    // Query SERVER-CALCULATED counts (source of truth)
    const reactionCounts = await prisma.messageReaction.groupBy({
      by: ["emoji"],
      where: { messageId },
      _count: { emoji: true },
    });

    const counts = reactionCounts.reduce(
      (acc, r) => {
        acc[r.emoji] = r._count.emoji;
        return acc;
      },
      {} as Record<string, number>
    );

    // Publish reaction update to Ably channel
    try {
      const channelName = getChatChannelName(
        message.channel.communityId,
        message.channelId
      );
      await publishToChannel(channelName, "reaction-update", {
        messageId,
        counts,
      });
    } catch (ablyError) {
      console.error("Failed to publish reaction update to Ably:", ablyError);
    }

    return { success: true, data: { counts } };
  } catch (error) {
    console.error("Failed to toggle reaction:", error);
    return { success: false, error: "Failed to update reaction" };
  }
}
