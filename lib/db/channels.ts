import { prisma } from "@/lib/prisma";

/**
 * Get all channels for a community
 */
export async function getChannels(communityId: string) {
  return prisma.chatChannel.findMany({
    where: { communityId },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

/**
 * Get a channel by ID with community info
 */
export async function getChannelById(channelId: string) {
  return prisma.chatChannel.findUnique({
    where: { id: channelId },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });
}

/**
 * Get the default channel for a community
 */
export async function getDefaultChannel(communityId: string) {
  return prisma.chatChannel.findFirst({
    where: { communityId, isDefault: true },
  });
}

/**
 * Create the default #general channel for a new community
 */
export async function createDefaultChannel(communityId: string) {
  return prisma.chatChannel.create({
    data: {
      name: "general",
      description: "General discussion",
      communityId,
      isDefault: true,
    },
  });
}

/**
 * Get messages for a channel with pagination (cursor-based)
 */
export async function getChannelMessages(
  channelId: string,
  limit: number = 50,
  cursor?: string
) {
  const messages = await prisma.message.findMany({
    where: {
      channelId,
      deletedAt: null,
    },
    take: limit + 1, // Take one extra to determine if there are more
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0, // Skip the cursor item itself
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, -1) : messages;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  // Reverse to get chronological order (oldest first)
  return {
    messages: items.reverse(),
    nextCursor,
    hasMore,
  };
}

/**
 * Check if a channel name is unique within a community
 */
export async function isChannelNameUnique(
  communityId: string,
  name: string,
  excludeChannelId?: string
) {
  const existing = await prisma.chatChannel.findFirst({
    where: {
      communityId,
      name: name.toLowerCase(),
      ...(excludeChannelId ? { NOT: { id: excludeChannelId } } : {}),
    },
  });
  return !existing;
}
