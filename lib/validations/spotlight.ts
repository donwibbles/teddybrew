import { z } from "zod";

/**
 * Validation schemas for spotlight operations
 */

/**
 * Schema for spotlighting/unspotlighting an event
 */
export const spotlightEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  spotlight: z.boolean(),
  notifyMembers: z.boolean().optional().default(false),
});

export type SpotlightEventInput = z.infer<typeof spotlightEventSchema>;

/**
 * Schema for reordering spotlighted events
 */
export const reorderSpotlightSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  eventIds: z.array(z.string()).min(1, "At least one event ID is required"),
});

export type ReorderSpotlightInput = z.infer<typeof reorderSpotlightSchema>;
