"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  voteCommentSchema,
  getCommentsSchema,
  MAX_COMMENT_DEPTH,
} from "@/lib/validations/comment";
import { publishToChannel, getForumChannelName } from "@/lib/ably";
import { checkCommentRateLimit, checkVoteRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "./notification";
import { NotificationType } from "@prisma/client";
import type { ActionResult } from "./community";
import { isMember, canModerate, logModerationAction } from "@/lib/db/members";
import { captureServerError, captureFireAndForgetError } from "@/lib/sentry";

/**
 * Create a comment
 */
export async function createComment(
  input: unknown
): Promise<ActionResult<{ commentId: string }>> {
  try {
    const { userId } = await verifySession();

    const parsed = createCommentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { postId, content, parentId } = parsed.data;

    // Rate limiting: 5 comments per minute
    const rateLimit = await checkCommentRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "Please wait before posting another comment" };
    }

    // Get post with community
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        authorId: true,
        communityId: true,
        deletedAt: true,
        community: { select: { id: true, slug: true } },
      },
    });

    if (!post || post.deletedAt) {
      return { success: false, error: "Post not found" };
    }

    // Check membership
    if (!(await isMember(userId, post.communityId))) {
      return { success: false, error: "You must be a member to comment" };
    }

    // Calculate depth if replying to another comment
    let depth = 0;
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { depth: true, deletedAt: true },
      });

      if (!parent || parent.deletedAt) {
        return { success: false, error: "Parent comment not found" };
      }

      depth = parent.depth + 1;

      if (depth > MAX_COMMENT_DEPTH) {
        return {
          success: false,
          error: "Maximum reply depth reached. Please reply to a higher comment.",
        };
      }
    }

    // Create comment and update count
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          content,
          postId,
          authorId: userId,
          parentId,
          depth,
        },
      });

      // Increment comment count on post
      await tx.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });

      // Update community lastActivityAt
      await tx.community.update({
        where: { id: post.communityId },
        data: { lastActivityAt: new Date() },
      });

      return newComment;
    });

    // Notify via Ably
    try {
      await publishToChannel(getForumChannelName(post.communityId), "new-comment", {
        postId,
        commentId: comment.id,
      });
    } catch (err) {
      console.error("Failed to publish comment notification:", err);
      captureFireAndForgetError("comment.publishToAbly", err);
    }

    // Send notifications
    if (parentId) {
      // Notify parent comment author (reply notification)
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true, content: true },
      });
      if (parentComment && parentComment.authorId !== userId) {
        sendNotification({
          type: NotificationType.COMMENT_REPLY,
          userId: parentComment.authorId,
          title: "New reply to your comment",
          message: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
          link: `/communities/${post.community.slug}/forum/${postId}#comment-${comment.id}`,
        }).catch((err) => {
          console.warn("Failed to send notification:", err);
          captureFireAndForgetError("comment.sendReplyNotification", err);
        });
      }
    } else {
      // Notify post author (new comment notification)
      if (post.authorId !== userId) {
        sendNotification({
          type: NotificationType.POST_COMMENT,
          userId: post.authorId,
          title: `New comment on "${post.title.slice(0, 30)}${post.title.length > 30 ? "..." : ""}"`,
          message: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
          link: `/communities/${post.community.slug}/forum/${postId}#comment-${comment.id}`,
        }).catch((err) => {
          console.warn("Failed to send notification:", err);
          captureFireAndForgetError("comment.sendCommentNotification", err);
        });
      }
    }

    revalidatePath(`/communities/${post.community.slug}/forum/${postId}`);

    return { success: true, data: { commentId: comment.id } };
  } catch (error) {
    console.error("Failed to create comment:", error);
    captureServerError("comment.create", error);
    return { success: false, error: "Failed to create comment" };
  }
}

/**
 * Update a comment (author only)
 */
export async function updateComment(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = updateCommentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { commentId, content } = parsed.data;

    // Get comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: { community: { select: { slug: true } } },
        },
      },
    });

    if (!comment || comment.deletedAt) {
      return { success: false, error: "Comment not found" };
    }

    // Only author can edit
    if (comment.authorId !== userId) {
      return { success: false, error: "You can only edit your own comments" };
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        updatedAt: new Date(),
      },
    });

    revalidatePath(
      `/communities/${comment.post.community.slug}/forum/${comment.postId}`
    );

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update comment:", error);
    captureServerError("comment.update", error);
    return { success: false, error: "Failed to update comment" };
  }
}

/**
 * Delete a comment (author or community owner)
 */
export async function deleteComment(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = deleteCommentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { commentId } = parsed.data;

    // Get comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: { community: { select: { id: true, slug: true } } },
        },
      },
    });

    if (!comment || comment.deletedAt) {
      return { success: false, error: "Comment not found" };
    }

    // Check permission: author or moderator/owner
    const isAuthor = comment.authorId === userId;
    const canMod = await canModerate(userId, comment.post.communityId);

    if (!isAuthor && !canMod) {
      return { success: false, error: "You can only delete your own comments" };
    }

    // Soft delete and decrement count
    await prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id: commentId },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        },
      });

      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });
    });

    // Log moderation action if not author
    if (!isAuthor && canMod) {
      logModerationAction({
        communityId: comment.post.communityId,
        moderatorId: userId,
        action: "DELETE_COMMENT",
        targetType: "Comment",
        targetId: commentId,
        targetTitle: comment.content.slice(0, 100),
      }).catch((err) => {
        console.error("Failed to log moderation action:", err);
        captureFireAndForgetError("comment.logModeration", err);
      });
    }

    revalidatePath(
      `/communities/${comment.post.community.slug}/forum/${comment.postId}`
    );

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete comment:", error);
    captureServerError("comment.delete", error);
    return { success: false, error: "Failed to delete comment" };
  }
}

/**
 * Vote on a comment
 */
export async function voteComment(
  input: unknown
): Promise<ActionResult<{ newScore: number }>> {
  try {
    const { userId } = await verifySession();

    const parsed = voteCommentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { commentId, value } = parsed.data;

    // Rate limiting: 10 votes per minute
    const rateLimit = await checkVoteRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're voting too fast. Please slow down." };
    }

    // Get comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: { community: { select: { id: true } } },
        },
      },
    });

    if (!comment || comment.deletedAt) {
      return { success: false, error: "Comment not found" };
    }

    // Check membership
    if (!(await isMember(userId, comment.post.communityId))) {
      return { success: false, error: "You must be a member to vote" };
    }

    // Get existing vote
    const existingVote = await prisma.commentVote.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    const oldValue = existingVote?.value ?? 0;
    const scoreDelta = value - oldValue;

    // Update vote and score in transaction
    await prisma.$transaction(async (tx) => {
      if (value === 0 && existingVote) {
        // Remove vote
        await tx.commentVote.delete({
          where: { commentId_userId: { commentId, userId } },
        });
      } else if (value !== 0) {
        // Upsert vote
        await tx.commentVote.upsert({
          where: { commentId_userId: { commentId, userId } },
          create: { commentId, userId, value },
          update: { value },
        });
      }

      // Update cached score
      await tx.comment.update({
        where: { id: commentId },
        data: { voteScore: { increment: scoreDelta } },
      });
    });

    const newScore = comment.voteScore + scoreDelta;

    return { success: true, data: { newScore } };
  } catch (error) {
    console.error("Failed to vote on comment:", error);
    captureServerError("comment.vote", error);
    return { success: false, error: "Failed to vote" };
  }
}

/**
 * Get comments for a post
 */
export async function getComments(input: unknown) {
  try {
    const parsed = getCommentsSchema.safeParse(input);
    if (!parsed.success) {
      return [];
    }

    const { postId, sort } = parsed.data;

    // Try to get user ID for vote status
    let userId: string | undefined;
    try {
      const session = await verifySession();
      userId = session.userId;
    } catch {
      // Not logged in, that's fine
    }

    // Get post to check community access
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        communityId: true,
        community: { select: { type: true } },
      },
    });

    const emptyResult = { comments: [], nextCursor: undefined, hasMore: false };

    if (!post) return emptyResult;

    // For private communities, require membership
    if (post.community.type === "PRIVATE") {
      if (!userId) return emptyResult; // Not logged in
      const memberCheck = await isMember(userId, post.communityId);
      if (!memberCheck) return emptyResult;
    }

    // Import here to avoid circular dependencies
    const { getPostComments } = await import("@/lib/db/posts");
    return await getPostComments(postId, sort, userId);
  } catch {
    return { comments: [], nextCursor: undefined, hasMore: false };
  }
}
