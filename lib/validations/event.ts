import { z } from "zod";
import { isValidTimezone } from "@/lib/utils/timezone";
import { US_STATE_CODES } from "@/lib/constants/us-states";

/**
 * Validation schemas for event operations
 */

// Event type enum values (must match Prisma enum)
export const EVENT_TYPES = [
  "CANVASS",
  "PHONE_BANK",
  "TEXT_BANK",
  "MEETING",
  "RALLY",
  "TOWN_HALL",
  "FUNDRAISER",
  "TRAINING",
  "SIGN_WAVING",
  "VOTER_REGISTRATION",
  "TABLING",
  "WATCH_PARTY",
  "OTHER",
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number];

// Event type display labels
export const EVENT_TYPE_LABELS: Record<EventTypeValue, string> = {
  CANVASS: "Canvass",
  PHONE_BANK: "Phone Bank",
  TEXT_BANK: "Text Bank",
  MEETING: "Meeting",
  RALLY: "Rally",
  TOWN_HALL: "Town Hall",
  FUNDRAISER: "Fundraiser",
  TRAINING: "Training",
  SIGN_WAVING: "Sign Waving",
  VOTER_REGISTRATION: "Voter Registration",
  TABLING: "Tabling",
  WATCH_PARTY: "Watch Party",
  OTHER: "Other",
};

// Location fields for events
export const eventCitySchema = z
  .string()
  .max(100, "City must be at most 100 characters")
  .optional()
  .nullable()
  .transform((val) => val?.trim() || null);

export const eventStateSchema = z
  .enum(US_STATE_CODES, { message: "Invalid state code" })
  .optional()
  .nullable();

// Event type schema (optional)
export const eventTypeSchema = z
  .enum(EVENT_TYPES, { message: "Invalid event type" })
  .optional()
  .nullable();

// Issue tags (array of tag IDs)
export const issueTagIdsSchema = z
  .array(z.string().min(1))
  .max(10, "Maximum 10 tags allowed")
  .optional()
  .default([]);

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

// Session title (optional)
export const sessionTitleSchema = z
  .string()
  .max(200, "Session title must be at most 200 characters")
  .optional()
  .transform((val) => val?.trim() || undefined);

// Optional end date - must be after start date
const optionalEndDateSchema = z
  .string()
  .or(z.date())
  .transform((val) => new Date(val))
  .optional()
  .nullable();

// Session schema for multi-session events
export const sessionSchema = z
  .object({
    id: z.string().optional(), // For existing sessions during edit
    title: sessionTitleSchema,
    startTime: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    endTime: optionalEndDateSchema,
    location: eventLocationSchema, // Override event location
    capacity: eventCapacitySchema, // Override event capacity
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

// Meeting URL validation
export const meetingUrlSchema = z
  .string()
  .max(500, "Meeting URL must be at most 500 characters")
  .url("Must be a valid URL")
  .optional()
  .or(z.literal(""))
  .transform((val) => val?.trim() || undefined);

/**
 * Schema for creating a new event
 * Events can have multiple sessions - if no sessions provided, one is auto-created
 */
export const createEventSchema = z
  .object({
    communityId: z.string().min(1, "Community ID is required"),
    title: eventTitleSchema,
    description: eventDescriptionSchema,
    location: eventLocationSchema, // Default location/venue
    capacity: eventCapacitySchema, // Default capacity
    // Virtual event fields
    isVirtual: z.boolean().optional().default(false),
    meetingUrl: meetingUrlSchema,
    // Cover image URL
    coverImage: z.string().url().max(500).optional().nullable(),
    // Location fields (separate from venue)
    city: eventCitySchema,
    state: eventStateSchema,
    // Event categorization
    eventType: eventTypeSchema,
    issueTagIds: issueTagIdsSchema,
    // Timezone (IANA format, e.g., "America/New_York")
    timezone: z
      .string()
      .refine(isValidTimezone, "Invalid timezone")
      .default("America/New_York"),
    // Sessions - at least one required
    sessions: z
      .array(sessionSchema)
      .min(1, "At least one session is required")
      .max(50, "Maximum 50 sessions allowed"),
  })
  .refine(
    (data) => {
      // Ensure all sessions have future start times
      const now = new Date();
      return data.sessions.every((s) => s.startTime > now);
    },
    {
      message: "All sessions must be in the future",
      path: ["sessions"],
    }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

// Session update schema - includes id for existing sessions
export const sessionUpdateSchema = z.object({
  id: z.string().optional(), // Existing session ID (omit for new sessions)
  title: sessionTitleSchema,
  startTime: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  endTime: optionalEndDateSchema,
  location: eventLocationSchema,
  capacity: eventCapacitySchema,
});

/**
 * Schema for updating an event
 */
export const updateEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  title: eventTitleSchema.optional(),
  description: eventDescriptionSchema,
  location: eventLocationSchema,
  capacity: eventCapacitySchema,
  // Cover image URL
  coverImage: z.string().url().max(500).optional().nullable(),
  // Virtual event fields
  isVirtual: z.boolean().optional(),
  meetingUrl: meetingUrlSchema,
  // Location fields (separate from venue)
  city: eventCitySchema,
  state: eventStateSchema,
  // Event categorization
  eventType: eventTypeSchema,
  issueTagIds: issueTagIdsSchema,
  // Timezone (IANA format, e.g., "America/New_York")
  timezone: z
    .string()
    .refine(isValidTimezone, "Invalid timezone")
    .optional(),
  // Sessions to update/add - all sessions not in this list will be deleted
  sessions: z
    .array(sessionUpdateSchema)
    .min(1, "At least one session is required")
    .max(50, "Maximum 50 sessions allowed")
    .optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Schema for deleting an event
 */
export const deleteEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type DeleteEventInput = z.infer<typeof deleteEventSchema>;

/**
 * Schema for RSVP to a session
 */
export const rsvpSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type RSVPSessionInput = z.infer<typeof rsvpSessionSchema>;

/**
 * Schema for canceling RSVP to a session
 */
export const cancelRsvpSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type CancelRSVPInput = z.infer<typeof cancelRsvpSchema>;

/**
 * Schema for RSVP to all sessions of an event at once
 */
export const rsvpAllSessionsSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
});

export type RSVPAllSessionsInput = z.infer<typeof rsvpAllSessionsSchema>;

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
  // Location filters
  state: eventStateSchema,
  isVirtual: z.boolean().optional(),
  // Type and tag filters
  eventType: eventTypeSchema,
  issueTagSlugs: z.array(z.string()).optional(),
});

export type SearchEventsInput = z.infer<typeof searchEventsSchema>;
