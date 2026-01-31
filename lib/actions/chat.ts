"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  sendMessageSchema,
  deleteMessageSchema,
  getMessagesSchema,
  getThreadMessagesSchema,
  pinMessageSchema,
  getPinnedMessagesSchema,
  markChannelReadSchema,
  getUnreadCountsSchema,
} from "@/lib/validations/chat";
import { publishToChannel, getChatChannelName } from "@/lib/ably";
import { checkChatRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "./community";
import { isMember, canModerate, logModerationAction } from "@/lib/db/members";
import { captureServerError, captureFireAndForgetError } from "@/lib/sentry";

// Regex to match @username mentions
const MENTION_REGEX = /@([a-zA-Z0-9_-]+)/g;

/**
 * Extract mentioned usernames from message content
 */
function extractMentions(content: string): string[] {
  const matches = content.match(MENTION_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))]; // Remove @ and dedupe
}

/**
 * Create notifications for mentioned users
 */
async function createMentionNotifications(
  mentionedUsernames: string[],
  authorId: string,
  authorName: string | null,
  messageContent: string,
  communityId: string,
  communitySlug: string,
  channelId: string
) {
  if (mentionedUsernames.length === 0) return;

  // Find users by username
  const users = await prisma.user.findMany({
    where: {
      username: { in: mentionedUsernames },
      id: { not: authorId }, // Don't notify yourself
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  // Check membership for each user
  const memberUserIds = await prisma.member
    .findMany({
      where: {
        communityId,
        userId: { in: users.map((u) => u.id) },
      },
      select: { userId: true },
    })
    .then((members) => members.map((m) => m.userId));

  if (memberUserIds.length === 0) return;

  // Create notifications
  await prisma.notification.createMany({
    data: memberUserIds.map((userId) => ({
      type: "CHAT_MENTION" as const,
      userId,
      title: `${authorName || "Someone"} mentioned you`,
      message: messageContent.slice(0, 100),
      link: `/communities/${communitySlug}/chat?channel=${channelId}`,
    })),
  });
}

/**
 * Create notification for reply
 */
async function createReplyNotification(
  parentAuthorId: string,
  replyAuthorId: string,
  replyAuthorName: string | null,
  messageContent: string,
  communitySlug: string,
  channelId: string
) {
  // Don't notify if replying to yourself
  if (parentAuthorId === replyAuthorId) return;

  await prisma.notification.create({
    data: {
      type: "CHAT_REPLY",
      userId: parentAuthorId,
      title: `${replyAuthorName || "Someone"} replied to your message`,
      message: messageContent.slice(0, 100),
      link: `/communities/${communitySlug}/chat?channel=${channelId}`,
    },
  });
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
 * Send a chat message with 2-level threading support
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

    const { channelId, content, replyToId, clientMessageId } = parsed.data;

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

    // Get community slug for notifications
    const community = await prisma.community.findUnique({
      where: { id: accessCheck.communityId! },
      select: { slug: true },
    });

    // Sanitize content
    const sanitizedContent = sanitizeText(content);

    // Use transaction for atomic depth check + create
    const result = await prisma.$transaction(async (tx) => {
      let threadRootId: string | null = null;
      let depth = 0;
      let replyToData: { id: string; content: string; author: { id: string; name: string | null } } | null = null;
      let parentAuthorId: string | null = null;

      if (replyToId) {
        const parent = await tx.message.findUnique({
          where: { id: replyToId },
          select: {
            id: true,
            depth: true,
            threadRootId: true,
            channelId: true,
            deletedAt: true,
            content: true,
            authorId: true,
            author: { select: { id: true, name: true } },
          },
        });

        if (!parent) {
          throw new Error("Parent message not found");
        }
        if (parent.deletedAt) {
          throw new Error("Cannot reply to deleted message");
        }
        if (parent.channelId !== channelId) {
          throw new Error("Cannot reply across channels");
        }
        if (parent.depth >= 2) {
          throw new Error("Maximum reply depth reached (2 levels)");
        }

        depth = parent.depth + 1;
        // Level 1 uses parent.id as root, Level 2 uses parent's root
        threadRootId = parent.threadRootId || parent.id;
        parentAuthorId = parent.authorId;

        // Store minimal reply data for Ably broadcast
        replyToData = {
          id: parent.id,
          content: parent.content.slice(0, 100),
          author: parent.author,
        };
      }

      // Create message
      const message = await tx.message.create({
        data: {
          content: sanitizedContent,
          channelId,
          authorId: userId,
          replyToId: replyToId || null,
          threadRootId,
          depth,
          clientMessageId: clientMessageId || null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true,
              isPublic: true,
              memberships: {
                where: { communityId: accessCheck.communityId! },
                select: { role: true },
              },
            },
          },
        },
      });

      // Increment reply count on thread root (if this is a reply)
      if (threadRootId) {
        await tx.message.update({
          where: { id: threadRootId },
          data: { replyCount: { increment: 1 } },
        });
      }

      return { message, replyToData, parentAuthorId };
    });

    const { message, replyToData, parentAuthorId } = result;

    // Update community lastActivityAt (fire and forget)
    prisma.community
      .update({
        where: { id: accessCheck.communityId! },
        data: { lastActivityAt: new Date() },
      })
      .catch((err) => {
        console.warn("Failed to update lastActivityAt:", err);
        captureFireAndForgetError("chat.updateLastActivityAt", err);
      });

    // Create reply notification (fire and forget)
    if (parentAuthorId && community) {
      createReplyNotification(
        parentAuthorId,
        userId,
        message.author.name,
        sanitizedContent,
        community.slug,
        channelId
      ).catch((err) => {
        console.warn("Failed to create reply notification:", err);
        captureFireAndForgetError("chat.createReplyNotification", err);
      });
    }

    // Create mention notifications (fire and forget)
    const mentionedUsernames = extractMentions(sanitizedContent);
    if (mentionedUsernames.length > 0 && community) {
      createMentionNotifications(
        mentionedUsernames,
        userId,
        message.author.name,
        sanitizedContent,
        accessCheck.communityId!,
        community.slug,
        channelId
      ).catch((err) => {
        console.warn("Failed to create mention notifications:", err);
        captureFireAndForgetError("chat.createMentionNotifications", err);
      });
    }

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
            username: message.author.username,
            isPublic: message.author.isPublic,
            role: message.author.memberships[0]?.role ?? null,
          },
          createdAt: message.createdAt.toISOString(),
          replyToId: message.replyToId,
          replyTo: replyToData,
          threadRootId: message.threadRootId,
          depth: message.depth,
          replyCount: 0,
          reactionCounts: {},
          clientMessageId: message.clientMessageId, // For optimistic reconciliation
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
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message";
    return { success: false, error: errorMessage };
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

    // Use transaction for soft delete + reply count decrement
    await prisma.$transaction(async (tx) => {
      // Soft delete
      await tx.message.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        },
      });

      // Decrement reply count on thread root (if this is a reply)
      if (message.threadRootId) {
        await tx.message.update({
          where: { id: message.threadRootId },
          data: { replyCount: { decrement: 1 } },
        });
      }

      // If this message is a thread root, we don't need to update anything
      // The replies will still reference it (with deletedAt shown as placeholder)
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
    // Only fetch root messages (depth=0) for main chat - replies are shown in thread panel
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        deletedAt: null,
        depth: 0,
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
            username: true,
            isPublic: true,
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
          username: msg.author.username,
          isPublic: msg.author.isPublic,
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
        threadRootId: msg.threadRootId,
        depth: msg.depth,
        replyCount: msg.replyCount,
        isPinnedInChannel: msg.isPinnedInChannel,
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

/**
 * Get all messages in a thread (root + replies)
 */
export async function getThreadMessages(input: unknown) {
  try {
    const { userId } = await verifySession();

    const parsed = getThreadMessagesSchema.safeParse(input);
    if (!parsed.success) {
      return { messages: [], pinnedInThread: [] };
    }

    const { threadRootId } = parsed.data;

    // Get the thread root to check channel access
    const threadRoot = await prisma.message.findUnique({
      where: { id: threadRootId },
      select: {
        channelId: true,
        channel: { select: { communityId: true } },
      },
    });

    if (!threadRoot) {
      return { messages: [], pinnedInThread: [] };
    }

    // Verify user has access to this channel (membership check)
    if (!(await isMember(userId, threadRoot.channel.communityId))) {
      return { messages: [], pinnedInThread: [] };
    }

    // Fetch root message + all replies
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ id: threadRootId }, { threadRootId: threadRootId }],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
            isPublic: true,
            memberships: {
              where: { communityId: threadRoot.channel.communityId },
              select: { role: true },
            },
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true } },
          },
        },
        reactions: {
          select: { emoji: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Transform messages
    const transformedMessages = messages.map((msg) => {
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
          username: msg.author.username,
          isPublic: msg.author.isPublic,
          role: msg.author.memberships[0]?.role ?? null,
        },
        createdAt: msg.createdAt,
        deletedAt: msg.deletedAt,
        replyToId: msg.replyToId,
        replyTo: msg.replyTo
          ? {
              id: msg.replyTo.id,
              content: msg.replyTo.content.slice(0, 100),
              author: msg.replyTo.author,
            }
          : null,
        threadRootId: msg.threadRootId,
        depth: msg.depth,
        replyCount: msg.replyCount,
        isPinnedInThread: msg.isPinnedInThread,
        reactionCounts,
      };
    });

    // Get thread-pinned messages
    const pinnedInThread = transformedMessages.filter((m) => m.isPinnedInThread && !m.deletedAt);

    return { messages: transformedMessages, pinnedInThread };
  } catch {
    return { messages: [], pinnedInThread: [] };
  }
}

/**
 * Get pinned messages for a channel
 */
export async function getPinnedChannelMessages(input: unknown) {
  try {
    const { userId } = await verifySession();

    const parsed = getPinnedMessagesSchema.safeParse(input);
    if (!parsed.success) {
      return [];
    }

    const { channelId } = parsed.data;

    // Get channel to check membership
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      select: { communityId: true },
    });

    if (!channel) {
      return [];
    }

    // Verify channel access
    if (!(await isMember(userId, channel.communityId))) {
      return [];
    }

    const pinnedMessages = await prisma.message.findMany({
      where: {
        channelId,
        isPinnedInChannel: true,
        deletedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
            isPublic: true,
          },
        },
      },
      orderBy: { pinnedAt: "desc" },
    });

    return pinnedMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      author: msg.author,
      pinnedAt: msg.pinnedAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Pin or unpin a message
 */
export async function pinMessage(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = pinMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { messageId, pinType, isPinned } = parsed.data;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        channelId: true,
        deletedAt: true,
        channel: { select: { communityId: true } },
      },
    });

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.deletedAt) {
      return { success: false, error: "Cannot pin deleted message" };
    }

    // Check moderator permission
    const canMod = await canModerate(userId, message.channel.communityId);
    if (!canMod) {
      return { success: false, error: "Permission denied" };
    }

    // Update pin status
    await prisma.message.update({
      where: { id: messageId },
      data:
        pinType === "channel"
          ? {
              isPinnedInChannel: isPinned,
              pinnedAt: isPinned ? new Date() : null,
              pinnedById: isPinned ? userId : null,
            }
          : {
              isPinnedInThread: isPinned,
              pinnedAt: isPinned ? new Date() : null,
              pinnedById: isPinned ? userId : null,
            },
    });

    // Log moderation action
    logModerationAction({
      communityId: message.channel.communityId,
      moderatorId: userId,
      action: isPinned ? "PIN_MESSAGE" : "UNPIN_MESSAGE",
      targetType: "Message",
      targetId: messageId,
    }).catch((err) => {
      console.warn("Failed to log moderation action:", err);
      captureFireAndForgetError("chat.logPinModeration", err);
    });

    // Publish Ably event
    try {
      await publishToChannel(
        getChatChannelName(message.channel.communityId, message.channelId),
        "message-pinned",
        {
          messageId,
          pinType,
          isPinned,
        }
      );
    } catch (ablyError) {
      console.error("Failed to publish pin to Ably:", ablyError);
      captureFireAndForgetError("chat.publishPinToAbly", ablyError);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to pin message:", error);
    captureServerError("chat.pinMessage", error);
    return { success: false, error: "Failed to pin message" };
  }
}

/**
 * Mark a channel as read for the current user
 */
export async function markChannelRead(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = markChannelReadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { channelId } = parsed.data;

    // Verify channel access
    const accessCheck = await verifyChannelAccess(channelId, userId);
    if (!accessCheck.hasAccess) {
      return { success: false, error: accessCheck.error || "Access denied" };
    }

    // Upsert the read timestamp
    await prisma.userChannelRead.upsert({
      where: {
        userId_channelId: { userId, channelId },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        userId,
        channelId,
        lastReadAt: new Date(),
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to mark channel read:", error);
    captureServerError("chat.markChannelRead", error);
    return { success: false, error: "Failed to mark channel read" };
  }
}

/**
 * Get unread counts for all channels in a community
 */
export async function getUnreadCounts(input: unknown) {
  try {
    const { userId } = await verifySession();

    const parsed = getUnreadCountsSchema.safeParse(input);
    if (!parsed.success) {
      return {};
    }

    const { communityId } = parsed.data;

    // Verify membership
    if (!(await isMember(userId, communityId))) {
      return {};
    }

    // Get all channels for this community
    const channels = await prisma.chatChannel.findMany({
      where: { communityId },
      select: { id: true },
    });

    if (channels.length === 0) {
      return {};
    }

    const channelIds = channels.map((c) => c.id);

    // Get user's last read timestamps for these channels
    const userReads = await prisma.userChannelRead.findMany({
      where: {
        userId,
        channelId: { in: channelIds },
      },
      select: { channelId: true, lastReadAt: true },
    });

    const lastReadMap = new Map(userReads.map((r) => [r.channelId, r.lastReadAt]));

    // Count unread messages for each channel
    const unreadCounts: Record<string, number> = {};

    await Promise.all(
      channelIds.map(async (channelId) => {
        const lastReadAt = lastReadMap.get(channelId);
        const count = await prisma.message.count({
          where: {
            channelId,
            deletedAt: null,
            authorId: { not: userId }, // Don't count own messages
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        if (count > 0) {
          unreadCounts[channelId] = count;
        }
      })
    );

    return unreadCounts;
  } catch {
    return {};
  }
}
