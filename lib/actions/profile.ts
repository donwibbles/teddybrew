"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { updateProfileSchema, usernameSchema } from "@/lib/validations/profile";
import { isUsernameAvailable, updateUserProfile } from "@/lib/db/users";
import { checkProfileRateLimit } from "@/lib/rate-limit";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Update user profile (name, username, bio, interests, communityHope, isPublic)
 */
export async function updateProfile(
  input: unknown
): Promise<ActionResult<{ name: string; username: string }>> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Check rate limit
    const rateLimit = await checkProfileRateLimit(userId);
    if (!rateLimit.success) {
      return {
        success: false,
        error: "You're updating your profile too quickly. Please wait before making changes.",
      };
    }

    // Validate input
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const {
      firstName,
      lastName,
      name,
      username,
      bio,
      interests,
      communityHope,
      isPublic,
      showUpcomingEvents,
      showPastEvents,
      showCommunities,
      emailEventReminders,
    } = parsed.data;

    // Check username availability (excluding current user)
    const available = await isUsernameAvailable(username, userId);
    if (!available) {
      return { success: false, error: "This username is already taken" };
    }

    // Update profile
    // SECURITY: Only include boolean fields if explicitly provided to prevent
    // accidentally flipping values on partial updates
    const updatedUser = await updateUserProfile(userId, {
      firstName,
      lastName,
      name,
      username,
      bio: bio || null,
      interests: interests || null,
      communityHope: communityHope || null,
      ...(isPublic !== undefined && { isPublic }),
      ...(showUpcomingEvents !== undefined && { showUpcomingEvents }),
      ...(showPastEvents !== undefined && { showPastEvents }),
      ...(showCommunities !== undefined && { showCommunities }),
      ...(emailEventReminders !== undefined && { emailEventReminders }),
    });

    revalidatePath("/profile");
    revalidatePath("/settings");
    // Revalidate public profile page
    if (updatedUser.username) {
      revalidatePath(`/u/${updatedUser.username}`);
    }

    return {
      success: true,
      data: {
        name: updatedUser.name || "",
        username: updatedUser.username || "",
      },
    };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(
  username: string
): Promise<ActionResult<{ available: boolean }>> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate username format first
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const normalizedUsername = parsed.data;

    // Check availability (excluding current user's username)
    const available = await isUsernameAvailable(normalizedUsername, userId);

    return { success: true, data: { available } };
  } catch (error) {
    console.error("Failed to check username availability:", error);
    return { success: false, error: "Failed to check username availability" };
  }
}
