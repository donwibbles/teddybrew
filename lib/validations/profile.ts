import { z } from "zod";

/**
 * Username validation rules:
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Cannot start or end with underscore
 * - Cannot have consecutive underscores
 */
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/,
    "Username can only contain letters, numbers, and underscores (cannot start or end with underscore)"
  )
  .regex(
    /^(?!.*__)/,
    "Username cannot contain consecutive underscores"
  )
  .transform((val) => val.toLowerCase());

/**
 * Display name validation
 */
export const nameSchema = z
  .string()
  .min(1, "Display name is required")
  .max(50, "Display name must be at most 50 characters")
  .transform((val) => val.trim());

/**
 * First name validation (private, for mail merge)
 */
export const firstNameSchema = z
  .string()
  .min(1, "First name is required")
  .max(50, "First name must be at most 50 characters")
  .transform((val) => val.trim());

/**
 * Last name validation (private, for mail merge)
 */
export const lastNameSchema = z
  .string()
  .min(1, "Last name is required")
  .max(50, "Last name must be at most 50 characters")
  .transform((val) => val.trim());

/**
 * Bio validation (optional, max 500 chars)
 */
export const bioSchema = z
  .string()
  .max(500, "Bio must be at most 500 characters")
  .transform((val) => val.trim())
  .optional()
  .nullable();

/**
 * Interests validation (optional, max 500 chars)
 */
export const interestsSchema = z
  .string()
  .max(500, "Interests must be at most 500 characters")
  .transform((val) => val.trim())
  .optional()
  .nullable();

/**
 * Community hope validation (optional, max 500 chars)
 */
export const communityHopeSchema = z
  .string()
  .max(500, "Response must be at most 500 characters")
  .transform((val) => val.trim())
  .optional()
  .nullable();

/**
 * Profile update schema
 */
export const updateProfileSchema = z.object({
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  name: nameSchema,
  username: usernameSchema,
  bio: bioSchema,
  interests: interestsSchema,
  communityHope: communityHopeSchema,
  isPublic: z.boolean().optional(),
  // Granular privacy controls
  showUpcomingEvents: z.boolean().optional(),
  showPastEvents: z.boolean().optional(),
  showCommunities: z.boolean().optional(),
  // Email preferences
  emailEventReminders: z.boolean().optional(),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileData = z.output<typeof updateProfileSchema>;

/**
 * Account deletion schema
 * Requires exact confirmation phrase for safety
 */
export const deleteAccountSchema = z.object({
  confirmationPhrase: z
    .string()
    .min(1, "Confirmation phrase is required"),
});

export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;
