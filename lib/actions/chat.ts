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
import type { ActionResult } from "./community";

// Rate limiting: track last message time per user
const lastMessageTime = new Map<string, number>();
const MESSAGE_RATE_LIMIT_MS = 1000; // 1 second

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

    const { channelId, content } = parsed.data;

    // Rate limiting
    const lastTime = lastMessageTime.get(userId);
    if (lastTime && Date.now() - lastTime < MESSAGE_RATE_LIMIT_MS) {
      return { success: false, error: "Please wait before sending another message" };
    }

    // Get channel with community info
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        community: { select: { id: true } },
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Check membership
    if (!(await isMember(channel.communityId, userId))) {
      return { success: false, error: "You must be a member to send messages" };
    }

    // Sanitize content
    const sanitizedContent = sanitizeText(content);

    // Create message
    const message = await prisma.message.create({
      data: {
        content: sanitizedContent,
        channelId,
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Update rate limit tracker
    lastMessageTime.set(userId, Date.now());

    // Publish to Ably channel
    try {
      await publishToChannel(
        getChatChannelName(channel.communityId, channelId),
        "message",
        {
          id: message.id,
          content: message.content,
          channelId: message.channelId,
          authorId: message.authorId,
          author: message.author,
          createdAt: message.createdAt.toISOString(),
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

    // Get messages
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
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      messages: items.reverse(), // Chronological order
      nextCursor,
      hasMore,
    };
  } catch {
    return { messages: [], nextCursor: undefined, hasMore: false };
  }
}
