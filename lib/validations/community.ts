import { z } from "zod";

/**
 * Validation schemas for community operations
 */

// Slug validation - lowercase, alphanumeric, hyphens only
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    slugRegex,
    "Slug must be lowercase letters, numbers, and hyphens only (no spaces or special characters)"
  )
  .transform((val) => val.toLowerCase().trim());

export const communityNameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(100, "Name must be at most 100 characters")
  .transform((val) => val.trim());

export const communityDescriptionSchema = z
  .string()
  .max(2000, "Description must be at most 2000 characters")
  .optional()
  .transform((val) => val?.trim() || undefined);

export const communityTypeSchema = z.enum(["PUBLIC", "PRIVATE"], {
  message: "Type must be PUBLIC or PRIVATE",
});

/**
 * Schema for creating a new community
 */
export const createCommunitySchema = z.object({
  name: communityNameSchema,
  slug: slugSchema,
  description: communityDescriptionSchema,
  type: communityTypeSchema.default("PUBLIC"),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;

/**
 * Schema for updating a community
 * Note: slug is immutable and cannot be changed after creation
 */
export const updateCommunitySchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  name: communityNameSchema.optional(),
  description: communityDescriptionSchema,
  type: communityTypeSchema.optional(),
});

export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;

/**
 * Schema for deleting a community
 */
export const deleteCommunitySchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  confirmName: z.string().min(1, "Confirmation is required"),
});

export type DeleteCommunityInput = z.infer<typeof deleteCommunitySchema>;

/**
 * Schema for joining a community
 */
export const joinCommunitySchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
});

export type JoinCommunityInput = z.infer<typeof joinCommunitySchema>;

/**
 * Schema for leaving a community
 */
export const leaveCommunitySchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
});

export type LeaveCommunityInput = z.infer<typeof leaveCommunitySchema>;

/**
 * Schema for removing a member from a community
 */
export const removeMemberSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  memberId: z.string().min(1, "Member ID is required"),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

/**
 * Schema for community search/filter
 */
export const searchCommunitiesSchema = z.object({
  query: z
    .string()
    .max(100, "Search query too long")
    .optional()
    .transform((val) => val?.trim().toLowerCase() || undefined),
  type: z.enum(["ALL", "PUBLIC", "PRIVATE"]).optional().default("ALL"),
});

export type SearchCommunitiesInput = z.infer<typeof searchCommunitiesSchema>;

/**
 * Helper to generate a slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}
