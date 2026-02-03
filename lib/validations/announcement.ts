import { z } from "zod";

/**
 * Validation schemas for announcement operations
 */

export const announcementTitleSchema = z
  .string()
  .min(1, "Title is required")
  .max(200, "Title must be at most 200 characters")
  .transform((val) => val.trim());

export const announcementContentSchema = z
  .string()
  .min(1, "Content is required")
  .max(5000, "Content must be at most 5000 characters")
  .transform((val) => val.trim());

/**
 * Schema for creating an announcement
 */
export const createAnnouncementSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  title: announcementTitleSchema,
  content: announcementContentSchema,
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

/**
 * Schema for updating an announcement
 */
export const updateAnnouncementSchema = z.object({
  announcementId: z.string().min(1, "Announcement ID is required"),
  title: announcementTitleSchema.optional(),
  content: announcementContentSchema.optional(),
  isActive: z.boolean().optional(),
});

export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

/**
 * Schema for deleting an announcement
 */
export const deleteAnnouncementSchema = z.object({
  announcementId: z.string().min(1, "Announcement ID is required"),
});

export type DeleteAnnouncementInput = z.infer<typeof deleteAnnouncementSchema>;

/**
 * Schema for reordering announcements
 */
export const reorderAnnouncementsSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  announcementIds: z.array(z.string()).min(1, "At least one announcement ID is required"),
});

export type ReorderAnnouncementsInput = z.infer<typeof reorderAnnouncementsSchema>;
