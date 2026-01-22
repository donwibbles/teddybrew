"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  createChannelSchema,
  updateChannelSchema,
  deleteChannelSchema,
} from "@/lib/validations/chat";
import type { ActionResult } from "./community";
import { checkChannelRateLimit } from "@/lib/rate-limit";
import { isMember, isOwner } from "@/lib/db/members";

/**
 * Create a new channel - Owner only
 */
export async function createChannel(
  input: unknown
): Promise<ActionResult<{ channelId: string }>> {
  try {
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkChannelRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're creating channels too quickly. Please wait before creating another.",
      };
    }

    const parsed = createChannelSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, name, description } = parsed.data;

    // Check if user is owner
    if (!(await isOwner(userId, communityId))) {
      return {
        success: false,
        error: "Only community owners can create channels",
      };
    }

    // Get community slug for revalidation
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Check if channel name is unique
    const existing = await prisma.chatChannel.findUnique({
      where: { communityId_name: { communityId, name } },
    });

    if (existing) {
      return {
        success: false,
        error: "A channel with this name already exists",
      };
    }

    const channel = await prisma.chatChannel.create({
      data: {
        name,
        description,
        communityId,
        isDefault: false,
      },
    });

    revalidatePath(`/communities/${community.slug}/chat`);

    return { success: true, data: { channelId: channel.id } };
  } catch (error) {
    console.error("Failed to create channel:", error);
    return { success: false, error: "Failed to create channel" };
  }
}

/**
 * Update a channel - Owner only
 */
export async function updateChannel(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkChannelRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're making changes too quickly. Please wait before updating.",
      };
    }

    const parsed = updateChannelSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { channelId, name, description } = parsed.data;

    // Get channel with community info
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        community: { select: { id: true, slug: true, ownerId: true } },
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Check if user is owner
    if (!(await isOwner(userId, channel.communityId))) {
      return {
        success: false,
        error: "Only community owners can edit channels",
      };
    }

    // If updating name, check for uniqueness
    if (name && name !== channel.name) {
      const existing = await prisma.chatChannel.findUnique({
        where: {
          communityId_name: { communityId: channel.communityId, name },
        },
      });

      if (existing) {
        return {
          success: false,
          error: "A channel with this name already exists",
        };
      }
    }

    await prisma.chatChannel.update({
      where: { id: channelId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    revalidatePath(`/communities/${channel.community.slug}/chat`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update channel:", error);
    return { success: false, error: "Failed to update channel" };
  }
}

/**
 * Delete a channel - Owner only, cannot delete default channel
 */
export async function deleteChannel(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkChannelRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're making changes too quickly. Please wait before deleting.",
      };
    }

    const parsed = deleteChannelSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { channelId } = parsed.data;

    // Get channel with community info
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        community: { select: { id: true, slug: true } },
      },
    });

    if (!channel) {
      return { success: false, error: "Channel not found" };
    }

    // Check if user is owner
    if (!(await isOwner(userId, channel.communityId))) {
      return {
        success: false,
        error: "Only community owners can delete channels",
      };
    }

    // Cannot delete default channel
    if (channel.isDefault) {
      return {
        success: false,
        error: "Cannot delete the default channel",
      };
    }

    await prisma.chatChannel.delete({
      where: { id: channelId },
    });

    revalidatePath(`/communities/${channel.community.slug}/chat`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete channel:", error);
    return { success: false, error: "Failed to delete channel" };
  }
}

/**
 * Get all channels for a community (for members)
 */
export async function getChannels(communityId: string) {
  try {
    const { userId } = await verifySession();

    // Check membership
    if (!(await isMember(userId, communityId))) {
      return [];
    }

    const channels = await prisma.chatChannel.findMany({
      where: { communityId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return channels;
  } catch {
    return [];
  }
}
