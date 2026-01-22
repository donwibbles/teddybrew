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
  .min(1, "Name is required")
  .max(50, "Name must be at most 50 characters")
  .transform((val) => val.trim());

/**
 * Profile update schema
 */
export const updateProfileSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type UpdateProfileData = z.output<typeof updateProfileSchema>;
