import "server-only";

import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * Data Access Layer (DAL)
 * Centralized session and permission checks for the application
 */

/**
 * Get the current session (cached per request)
 * Returns null if no session exists
 */
export const getSession = cache(async () => {
  return await auth();
});

/**
 * Verify that a user is authenticated
 * Throws error if not authenticated
 * Returns the user ID
 */
export const verifySession = cache(async () => {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("Unauthorized - Please sign in");
  }

  return { userId: session.user.id! };
});

/**
 * Get current user ID or null
 * Does not throw error, useful for optional auth
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  return session?.user?.id ?? null;
});
