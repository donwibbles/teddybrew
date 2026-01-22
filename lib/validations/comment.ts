import { z } from "zod";
import { voteValueSchema } from "./post";

/**
 * Validation schemas for comments
 */

export const commentContentSchema = z
  .string()
  .min(1, "Comment cannot be empty")
  .max(10000, "Comment must be at most 10,000 characters")
  .transform((val) => val.trim());

export const commentSortSchema = z.enum(["best", "new"]).default("best");

// Maximum nesting depth for comments
export const MAX_COMMENT_DEPTH = 5;

/**
 * Schema for creating a comment
 */
export const createCommentSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  content: commentContentSchema,
  parentId: z.string().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/**
 * Schema for updating a comment
 */
export const updateCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  content: commentContentSchema,
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

/**
 * Schema for deleting a comment
 */
export const deleteCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
});

export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

/**
 * Schema for voting on a comment
 */
export const voteCommentSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required"),
  value: voteValueSchema,
});

export type VoteCommentInput = z.infer<typeof voteCommentSchema>;

/**
 * Schema for getting comments
 */
export const getCommentsSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  sort: commentSortSchema,
});

export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
