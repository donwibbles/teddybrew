"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import { updateProfileSchema, usernameSchema } from "@/lib/validations/profile";
import { isUsernameAvailable, updateUserProfile } from "@/lib/db/users";

/**
 * Action result types
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Update user profile (name and username)
 */
export async function updateProfile(
  input: unknown
): Promise<ActionResult<{ name: string; username: string }>> {
  try {
    // Verify user is authenticated
    const { userId } = await verifySession();

    // Validate input
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { name, username } = parsed.data;

    // Check username availability (excluding current user)
    const available = await isUsernameAvailable(username, userId);
    if (!available) {
      return { success: false, error: "This username is already taken" };
    }

    // Update profile
    const updatedUser = await updateUserProfile(userId, { name, username });

    revalidatePath("/profile");
    revalidatePath("/settings");

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
