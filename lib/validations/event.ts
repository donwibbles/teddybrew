import { z } from "zod";

/**
 * Validation schemas for event operations
 */

export const eventTitleSchema = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(200, "Title must be at most 200 characters")
  .transform((val) => val.trim());

export const eventDescriptionSchema = z
  .string()
  .max(5000, "Description must be at most 5000 characters")
  .optional()
  .transform((val) => val?.trim() || undefined);

export const eventLocationSchema = z
  .string()
  .max(500, "Location must be at most 500 characters")
  .optional()
  .transform((val) => val?.trim() || undefined);

export const eventCapacitySchema = z
  .number()
  .int("Capacity must be a whole number")
  .min(1, "Capacity must be at least 1")
  .max(10000, "Capacity must be at most 10,000")
  .optional()
  .nullable();

// Date validation - must be in the future
const futureDateSchema = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val))
  .refine((date) => date > new Date(), {
    message: "Date must be in the future",
  });

// Optional end date - must be after start date
const optionalEndDateSchema = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val))
  .optional()
  .nullable();

/**
 * Schema for creating a new event
 */
export const createEventSchema = z
  .object({
    communityId: z.string().min(1, "Community ID is required"),
    title: eventTitleSchema,
    description: eventDescriptionSchema,
    startTime: futureDateSchema,
    endTime: optionalEndDateSchema,
    location: eventLocationSchema,
    capacity: eventCapacitySchema,
  })
  .refine(
    (data) => {
      if (data.endTime && data.startTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Schema for updating an event
 */
export const updateEventSchema = z
  .object({
    eventId: z.string().min(1, "Event ID is required"),
    title: eventTitleSchema.optional(),
    description: eventDescriptionSchema,
    startTime: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val))
      .optional(),
    endTime: optionalEndDateSchema,
    location: eventLocationSchema,
    capacity: eventCapacitySchema,
  })
  .refine(
    (data) => {
      if (data.startTime && data.startTime <= new Date()) {
        return false;
      }
      return true;
    },
    {
      message: "Start time must be in the future",
      path: ["startTime"],
    }
  )
  .refine(
    (data) => {
      if (data.endTime && data.startTime && data.endTime <= data.startTime) {
        return false;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Schema for deleting an event
 */
export const deleteEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type DeleteEventInput = z.infer<typeof deleteEventSchema>;

/**
 * Schema for RSVP to an event
 */
export const rsvpEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type RSVPEventInput = z.infer<typeof rsvpEventSchema>;

/**
 * Schema for canceling RSVP
 */
export const cancelRsvpSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type CancelRSVPInput = z.infer<typeof cancelRsvpSchema>;

/**
 * Schema for adding a co-organizer
 */
export const addCoOrganizerSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export type AddCoOrganizerInput = z.infer<typeof addCoOrganizerSchema>;

/**
 * Schema for removing a co-organizer
 */
export const removeCoOrganizerSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export type RemoveCoOrganizerInput = z.infer<typeof removeCoOrganizerSchema>;

/**
 * Schema for event search/filter
 */
export const searchEventsSchema = z.object({
  query: z
    .string()
    .max(100, "Search query too long")
    .optional()
    .transform((val) => val?.trim().toLowerCase() || undefined),
  communityId: z.string().optional(),
  showPast: z.boolean().optional().default(false),
});

export type SearchEventsInput = z.infer<typeof searchEventsSchema>;
