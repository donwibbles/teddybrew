import { z } from "zod";

/**
 * Validation schemas for forum posts
 */

export const postTitleSchema = z
  .string()
  .min(5, "Title must be at least 5 characters")
  .max(300, "Title must be at most 300 characters")
  .transform((val) => val.trim());

export const postContentSchema = z
  .string()
  .min(10, "Content must be at least 10 characters")
  .max(40000, "Content must be at most 40,000 characters")
  .transform((val) => val.trim());

export const voteValueSchema = z
  .number()
  .int()
  .refine((val) => val === 1 || val === -1 || val === 0, {
    message: "Vote value must be 1, -1, or 0",
  });

export const postSortSchema = z.enum(["hot", "new", "top"]).default("hot");

/**
 * Schema for creating a new post
 */
export const createPostSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  title: postTitleSchema,
  content: postContentSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * Schema for updating a post
 */
export const updatePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  title: postTitleSchema.optional(),
  content: postContentSchema.optional(),
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/**
 * Schema for deleting a post
 */
export const deletePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

export type DeletePostInput = z.infer<typeof deletePostSchema>;

/**
 * Schema for voting on a post
 */
export const votePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  value: voteValueSchema,
});

export type VotePostInput = z.infer<typeof votePostSchema>;

/**
 * Schema for pinning/unpinning a post
 */
export const pinPostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  isPinned: z.boolean(),
});

export type PinPostInput = z.infer<typeof pinPostSchema>;

/**
 * Schema for getting posts with pagination
 */
export const getPostsSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  sort: postSortSchema,
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export type GetPostsInput = z.infer<typeof getPostsSchema>;

/**
 * Schema for getting public posts (global forum)
 */
export const getPublicPostsSchema = z.object({
  sort: postSortSchema,
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export type GetPublicPostsInput = z.infer<typeof getPublicPostsSchema>;
