"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  sendMessageSchema,
  deleteMessageSchema,
  getMessagesSchema,
} from "@/lib/validations/chat";
import { publishToChannel, getChatChannelName } from "@/lib/ably";
import { checkChatRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "./community";
import { isMember, canModerate, logModerationAction } from "@/lib/db/members";
import { captureServerError, captureFireAndForgetError } from "@/lib/sentry";

/**
 * Verify user has access to a channel
 * - Community membership required for all channels
 * - For event channels, also requires RSVP status GOING to any session
 */
export async function verifyChannelAccess(
  channelId: string,
  userId: string
): Promise<{ hasAccess: boolean; error?: string; communityId?: string }> {
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    include: {
      event: {
        select: {
          id: true,
          sessions: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!channel) {
    return { hasAccess: false, error: "Channel not found" };
  }

  // Check community membership
  const membershipCheck = await isMember(userId, channel.communityId);
  if (!membershipCheck) {
    return { hasAccess: false, error: "You must be a community member" };
  }

  // If event channel, also require RSVP
  if (channel.event) {
    const sessionIds = channel.event.sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      const rsvp = await prisma.rSVP.findFirst({
        where: {
          userId,
          sessionId: { in: sessionIds },
          status: "GOING",
        },
      });

      if (!rsvp) {
        return {
          hasAccess: false,
          error: "You must RSVP to the event to access this channel",
        };
      }
    }
  }

  return { hasAccess: true, communityId: channel.communityId };
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  input: unknown
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const { userId } = await verifySession();

    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { channelId, content, replyToId } = parsed.data;

    // Rate limiting (Redis-based, works across instances)
    const rateLimit = await checkChatRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "Please wait before sending another message" };
    }

    // Verify channel access (includes RSVP check for event channels)
    const accessCheck = await verifyChannelAccess(channelId, userId);
    if (!accessCheck.hasAccess) {
      return { success: false, error: accessCheck.error || "Access denied" };
    }

    // Validate reply if provided
    let replyToData = null;
    if (replyToId) {
      const replyToMessage = await prisma.message.findUnique({
        where: { id: replyToId },
        select: {
          id: true,
          channelId: true,
          replyToId: true,
          deletedAt: true,
          content: true,
          author: { select: { id: true, name: true } },
        },
      });

      if (!replyToMessage) {
        return { success: false, error: "Message not found" };
      }
      if (replyToMessage.channelId !== channelId) {
        return { success: false, error: "Cannot reply to message in different channel" };
      }
      if (replyToMessage.replyToId !== null) {
        return { success: false, error: "Cannot reply to a reply" };
      }
      if (replyToMessage.deletedAt !== null) {
        return { success: false, error: "Cannot reply to deleted message" };
      }

      // Store minimal reply data for Ably broadcast
      replyToData = {
        id: replyToMessage.id,
        content: replyToMessage.content.slice(0, 100),
        author: replyToMessage.author,
      };
    }

    // Sanitize content
    const sanitizedContent = sanitizeText(content);

    // Create message and get author's role
    const message = await prisma.message.create({
      data: {
        content: sanitizedContent,
        channelId,
        authorId: userId,
        replyToId: replyToId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            memberships: {
              where: { communityId: accessCheck.communityId! },
              select: { role: true },
            },
          },
        },
      },
    });

    // Update community lastActivityAt (fire and forget)
    prisma.community.update({
      where: { id: accessCheck.communityId! },
      data: { lastActivityAt: new Date() },
    }).catch((err) => {
      console.warn("Failed to update lastActivityAt:", err);
      captureFireAndForgetError("chat.updateLastActivityAt", err);
    });

    // Publish to Ably channel
    try {
      await publishToChannel(
        getChatChannelName(accessCheck.communityId!, channelId),
        "message",
        {
          id: message.id,
          content: message.content,
          channelId: message.channelId,
          authorId: message.authorId,
          author: {
            id: message.author.id,
            name: message.author.name,
            image: message.author.image,
            role: message.author.memberships[0]?.role ?? null,
          },
          createdAt: message.createdAt.toISOString(),
          replyToId: message.replyToId,
          replyTo: replyToData,
          reactionCounts: {},
        }
      );
    } catch (ablyError) {
      // Log but don't fail the request if Ably publish fails
      console.error("Failed to publish to Ably:", ablyError);
      captureFireAndForgetError("chat.publishMessageToAbly", ablyError);
    }

    return { success: true, data: { messageId: message.id } };
  } catch (error) {
    console.error("Failed to send message:", error);
    captureServerError("chat.sendMessage", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Delete a chat message (soft delete)
 * - Author can delete their own messages
 * - Community owner or moderator can delete any message
 */
export async function deleteChatMessage(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = deleteMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { messageId } = parsed.data;

    // Get message with channel and community info
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            community: { select: { id: true, ownerId: true } },
          },
        },
      },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.deletedAt) {
      return { success: false, error: "Message already deleted" };
    }

    // Check permission: author or moderator/owner
    const isMessageAuthor = message.authorId === userId;
    const canMod = await canModerate(userId, message.channel.communityId);

    if (!isMessageAuthor && !canMod) {
      return { success: false, error: "You can only delete your own messages" };
    }

    // Soft delete
    await prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    // Log moderation action if not author
    if (!isMessageAuthor && canMod) {
      logModerationAction({
        communityId: message.channel.communityId,
        moderatorId: userId,
        action: "DELETE_MESSAGE",
        targetType: "Message",
        targetId: messageId,
        targetTitle: message.content.slice(0, 100),
      }).catch((err) => {
        console.error("Failed to log moderation action:", err);
        captureFireAndForgetError("chat.logModeration", err);
      });
    }

    // Notify via Ably
    try {
      await publishToChannel(
        getChatChannelName(message.channel.communityId, message.channelId),
        "message-deleted",
        { messageId }
      );
    } catch (ablyError) {
      console.error("Failed to publish delete to Ably:", ablyError);
      captureFireAndForgetError("chat.publishDeleteToAbly", ablyError);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete message:", error);
    captureServerError("chat.deleteMessage", error);
    return { success: false, error: "Failed to delete message" };
  }
}

/**
 * Get chat messages for a channel with cursor-based pagination
 */
export async function getChatMessages(input: unknown) {
  try {
    const { userId } = await verifySession();

    const parsed = getMessagesSchema.safeParse(input);
    if (!parsed.success) {
      return { messages: [], nextCursor: undefined, hasMore: false };
    }

    const { channelId, cursor, limit } = parsed.data;

    // Get channel to check membership and event access
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: {
        communityId: true,
        event: { select: { id: true } },
      },
    });

    if (!channel) {
      return { messages: [], nextCursor: undefined, hasMore: false };
    }

    // Check membership
    if (!(await isMember(userId, channel.communityId))) {
      return { messages: [], nextCursor: undefined, hasMore: false };
    }

    // Check event channel access (RSVP required)
    if (channel.event) {
      const accessCheck = await verifyChannelAccess(channelId, userId);
      if (!accessCheck.hasAccess) {
        return { messages: [], nextCursor: undefined, hasMore: false };
      }
    }

    // Get messages with replyTo, reaction counts, and author role
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            memberships: {
              where: { communityId: channel.communityId },
              select: { role: true },
            },
          },
        },
        // Efficient replyTo - only fields needed for preview
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true } },
          },
        },
        // Get reactions for aggregation
        reactions: {
          select: { emoji: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    // Transform messages to include reaction counts and author role
    const transformedItems = items.map((msg) => {
      // Calculate reaction counts from reactions array
      const reactionCounts: Record<string, number> = {};
      msg.reactions.forEach((r) => {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
      });

      return {
        id: msg.id,
        content: msg.content,
        channelId: msg.channelId,
        authorId: msg.authorId,
        author: {
          id: msg.author.id,
          name: msg.author.name,
          image: msg.author.image,
          role: msg.author.memberships[0]?.role ?? null,
        },
        createdAt: msg.createdAt,
        replyToId: msg.replyToId,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo.id,
              content: msg.replyTo.content.slice(0, 100), // Truncate for preview
              author: msg.replyTo.author,
            }
          : null,
        reactionCounts,
      };
    });

    return {
      messages: transformedItems.reverse(), // Chronological order
      nextCursor,
      hasMore,
    };
  } catch {
    return { messages: [], nextCursor: undefined, hasMore: false };
  }
}
