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

/**
 * Check if user is a member of the community
 */
async function isMember(communityId: string, userId: string): Promise<boolean> {
  const membership = await prisma.member.findUnique({
    where: {
      userId_communityId: { userId, communityId },
    },
  });
  return !!membership;
}

/**
 * Check if user is the owner of the community
 */
async function isOwner(communityId: string, userId: string): Promise<boolean> {
  const membership = await prisma.member.findUnique({
    where: {
      userId_communityId: { userId, communityId },
    },
    select: { role: true },
  });
  return membership?.role === "OWNER";
}

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
  const membershipCheck = await isMember(channel.communityId, userId);
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

    // Create message
    const message = await prisma.message.create({
      data: {
        content: sanitizedContent,
        channelId,
        authorId: userId,
        replyToId: replyToId || null,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Update community lastActivityAt (fire and forget)
    prisma.community.update({
      where: { id: accessCheck.communityId! },
      data: { lastActivityAt: new Date() },
    }).catch((err) => console.warn("Failed to update lastActivityAt:", err));

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
          author: message.author,
          createdAt: message.createdAt.toISOString(),
          replyToId: message.replyToId,
          replyTo: replyToData,
          reactionCounts: {},
        }
      );
    } catch (ablyError) {
      // Log but don't fail the request if Ably publish fails
      console.error("Failed to publish to Ably:", ablyError);
    }

    return { success: true, data: { messageId: message.id } };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Delete a chat message (soft delete)
 * - Author can delete their own messages
 * - Community owner can delete any message
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

    // Check permission: author or community owner
    const isMessageAuthor = message.authorId === userId;
    const isCommunityOwner = await isOwner(message.channel.communityId, userId);

    if (!isMessageAuthor && !isCommunityOwner) {
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

    // Notify via Ably
    try {
      await publishToChannel(
        getChatChannelName(message.channel.communityId, message.channelId),
        "message-deleted",
        { messageId }
      );
    } catch (ablyError) {
      console.error("Failed to publish delete to Ably:", ablyError);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete message:", error);
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

    // Get channel to check membership
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: { communityId: true },
    });

    if (!channel) {
      return { messages: [], nextCursor: undefined, hasMore: false };
    }

    // Check membership
    if (!(await isMember(channel.communityId, userId))) {
      return { messages: [], nextCursor: undefined, hasMore: false };
    }

    // Get messages with replyTo and reaction counts
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
          select: { id: true, name: true, image: true },
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

    // Transform messages to include reaction counts
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
        author: msg.author,
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
