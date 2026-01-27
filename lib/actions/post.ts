"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  createPostSchema,
  updatePostSchema,
  deletePostSchema,
  votePostSchema,
  pinPostSchema,
  getPostsSchema,
  getPublicPostsSchema,
} from "@/lib/validations/post";
import { publishToChannel, getForumChannelName } from "@/lib/ably";
import { checkPostRateLimit, checkVoteRateLimit } from "@/lib/rate-limit";
import { isMember, canModerate, logModerationAction } from "@/lib/db/members";
import type { ActionResult } from "./community";

/**
 * Create a new post
 */
export async function createPost(
  input: unknown
): Promise<ActionResult<{ postId: string }>> {
  try {
    const { userId } = await verifySession();

    const parsed = createPostSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, title, content } = parsed.data;

    // Rate limiting: 1 post per minute
    const rateLimit = await checkPostRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "Please wait before creating another post" };
    }

    // Check membership
    if (!(await isMember(userId, communityId))) {
      return { success: false, error: "You must be a member to create posts" };
    }

    // Get community slug for revalidation
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Create post and update community activity
    const post = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          title: sanitizeText(title),
          content, // Keep markdown content as-is, sanitize on render
          communityId,
          authorId: userId,
        },
      });

      // Update community lastActivityAt
      await tx.community.update({
        where: { id: communityId },
        data: { lastActivityAt: new Date() },
      });

      return newPost;
    });

    // Notify via Ably
    try {
      await publishToChannel(getForumChannelName(communityId), "new-post", {
        postId: post.id,
        title: post.title,
      });
    } catch (err) {
      console.error("Failed to publish forum notification:", err);
    }

    revalidatePath(`/communities/${community.slug}/forum`);

    return { success: true, data: { postId: post.id } };
  } catch (error) {
    console.error("Failed to create post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

/**
 * Update a post (author only)
 */
export async function updatePost(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = updatePostSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { postId, title, content } = parsed.data;

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { community: { select: { slug: true } } },
    });

    if (!post || post.deletedAt) {
      return { success: false, error: "Post not found" };
    }

    // Only author can edit
    if (post.authorId !== userId) {
      return { success: false, error: "You can only edit your own posts" };
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        ...(title && { title: sanitizeText(title) }),
        ...(content && { content }),
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/communities/${post.community.slug}/forum`);
    revalidatePath(`/communities/${post.community.slug}/forum/${postId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update post:", error);
    return { success: false, error: "Failed to update post" };
  }
}

/**
 * Delete a post (author or community owner)
 */
export async function deletePost(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = deletePostSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { postId } = parsed.data;

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { community: { select: { id: true, slug: true } } },
    });

    if (!post || post.deletedAt) {
      return { success: false, error: "Post not found" };
    }

    // Check permission: author or moderator/owner
    const isAuthor = post.authorId === userId;
    const canMod = await canModerate(userId, post.communityId);

    if (!isAuthor && !canMod) {
      return { success: false, error: "You can only delete your own posts" };
    }

    // Soft delete
    await prisma.post.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    // Log moderation action if not author
    if (!isAuthor && canMod) {
      logModerationAction({
        communityId: post.communityId,
        moderatorId: userId,
        action: "DELETE_POST",
        targetType: "Post",
        targetId: postId,
        targetTitle: post.title,
      }).catch((err) => console.error("Failed to log moderation action:", err));
    }

    revalidatePath(`/communities/${post.community.slug}/forum`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete post:", error);
    return { success: false, error: "Failed to delete post" };
  }
}

/**
 * Vote on a post
 */
export async function votePost(
  input: unknown
): Promise<ActionResult<{ newScore: number }>> {
  try {
    const { userId } = await verifySession();

    const parsed = votePostSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { postId, value } = parsed.data;

    // Rate limiting: 10 votes per minute
    const rateLimit = await checkVoteRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're voting too fast. Please slow down." };
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { community: { select: { id: true, slug: true } } },
    });

    if (!post || post.deletedAt) {
      return { success: false, error: "Post not found" };
    }

    // Check membership
    if (!(await isMember(userId, post.communityId))) {
      return { success: false, error: "You must be a member to vote" };
    }

    // Get existing vote
    const existingVote = await prisma.postVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    const oldValue = existingVote?.value ?? 0;
    const scoreDelta = value - oldValue;

    // Update vote and score in transaction
    await prisma.$transaction(async (tx) => {
      if (value === 0 && existingVote) {
        // Remove vote
        await tx.postVote.delete({
          where: { postId_userId: { postId, userId } },
        });
      } else if (value !== 0) {
        // Upsert vote
        await tx.postVote.upsert({
          where: { postId_userId: { postId, userId } },
          create: { postId, userId, value },
          update: { value },
        });
      }

      // Update cached score
      await tx.post.update({
        where: { id: postId },
        data: { voteScore: { increment: scoreDelta } },
      });
    });

    const newScore = post.voteScore + scoreDelta;

    return { success: true, data: { newScore } };
  } catch (error) {
    console.error("Failed to vote on post:", error);
    return { success: false, error: "Failed to vote" };
  }
}

/**
 * Pin/unpin a post (owner or moderator)
 */
export async function pinPost(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = pinPostSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { postId, isPinned } = parsed.data;

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { community: { select: { id: true, slug: true } } },
    });

    if (!post || post.deletedAt) {
      return { success: false, error: "Post not found" };
    }

    // Only owner or moderator can pin
    if (!(await canModerate(userId, post.communityId))) {
      return { success: false, error: "Only moderators and owners can pin posts" };
    }

    await prisma.post.update({
      where: { id: postId },
      data: { isPinned },
    });

    // Log moderation action
    logModerationAction({
      communityId: post.communityId,
      moderatorId: userId,
      action: isPinned ? "PIN_POST" : "UNPIN_POST",
      targetType: "Post",
      targetId: postId,
      targetTitle: post.title,
    }).catch((err) => console.error("Failed to log moderation action:", err));

    revalidatePath(`/communities/${post.community.slug}/forum`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to pin post:", error);
    return { success: false, error: "Failed to pin post" };
  }
}

/**
 * Get posts for a community
 * - Public communities: anyone can view posts
 * - Private communities: only members can view posts
 */
export async function getPosts(input: unknown) {
  try {
    const parsed = getPostsSchema.safeParse(input);
    if (!parsed.success) {
      return { posts: [], nextCursor: undefined, hasMore: false };
    }

    const { communityId, sort, cursor, limit } = parsed.data;

    // Check community privacy
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { type: true },
    });

    if (!community) {
      return { posts: [], nextCursor: undefined, hasMore: false };
    }

    // Try to get user ID for vote status and membership check
    let userId: string | undefined;
    try {
      const session = await verifySession();
      userId = session.userId;
    } catch {
      // Not logged in
    }

    // For private communities, verify membership
    if (community.type === "PRIVATE") {
      if (!userId) {
        return { posts: [], nextCursor: undefined, hasMore: false };
      }
      const memberCheck = await isMember(userId, communityId);
      if (!memberCheck) {
        return { posts: [], nextCursor: undefined, hasMore: false };
      }
    }

    // Import here to avoid circular dependencies
    const { getPosts: getPostsDb } = await import("@/lib/db/posts");
    return await getPostsDb(communityId, sort, limit, cursor, userId);
  } catch {
    return { posts: [], nextCursor: undefined, hasMore: false };
  }
}

/**
 * Get public posts from all public communities (global forum)
 */
export async function getPublicPostsAction(input: unknown) {
  try {
    const parsed = getPublicPostsSchema.safeParse(input);
    if (!parsed.success) {
      return { posts: [], nextCursor: undefined, hasMore: false };
    }

    const { sort, cursor, limit } = parsed.data;

    // Try to get user ID for vote status
    let userId: string | undefined;
    try {
      const session = await verifySession();
      userId = session.userId;
    } catch {
      // Not logged in
    }

    // Import here to avoid circular dependencies
    const { getPublicPosts } = await import("@/lib/db/posts");
    return await getPublicPosts(sort, limit, cursor, userId);
  } catch {
    return { posts: [], nextCursor: undefined, hasMore: false };
  }
}
