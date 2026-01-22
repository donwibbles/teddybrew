"use server";

import { verifySession } from "@/lib/dal";
import type { ActionResult } from "@/lib/actions/community";

type RateLimitFn = (userId: string) => Promise<{ success: boolean }>;

interface ActionOptions {
  rateLimitFn?: RateLimitFn;
  rateLimitError?: string;
}

type ActionFn<TInput, TOutput> = (
  input: TInput,
  userId: string
) => Promise<ActionResult<TOutput>>;

/**
 * Create a protected action with automatic authentication and optional rate limiting.
 *
 * Features:
 * - Automatic verifySession() call
 * - Optional rate limiting
 * - Consistent error logging with context
 * - Type-safe input/output
 *
 * @example
 * export const createPost = createProtectedAction(
 *   async (input: CreatePostInput, userId) => {
 *     // Your action logic here
 *     return { success: true, data: { postId: "123" } };
 *   },
 *   { rateLimitFn: checkPostRateLimit }
 * );
 */
export function createProtectedAction<TInput, TOutput>(
  actionFn: ActionFn<TInput, TOutput>,
  options?: ActionOptions
): (input: TInput) => Promise<ActionResult<TOutput>> {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      // Verify user is authenticated
      const { userId } = await verifySession();

      // Check rate limit if provided
      if (options?.rateLimitFn) {
        const rateLimit = await options.rateLimitFn(userId);
        if (!rateLimit.success) {
          return {
            success: false,
            error:
              options.rateLimitError ||
              "You're doing this too quickly. Please wait before trying again.",
          };
        }
      }

      // Execute the action
      return await actionFn(input, userId);
    } catch (error) {
      // Log with context for debugging
      const actionName = actionFn.name || "anonymous action";
      console.error(`[${actionName}] Action failed:`, error);

      // Return generic error (don't expose internal details)
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };
}

/**
 * Wrap an existing action function to add consistent error handling.
 * Use this for actions that need custom authentication logic.
 *
 * @example
 * export const getPosts = wrapAction(async (input: GetPostsInput) => {
 *   // Your action logic here - manually verify session if needed
 *   return { posts: [], hasMore: false };
 * });
 */
export function wrapAction<TInput, TOutput>(
  actionFn: (input: TInput) => Promise<TOutput>,
  errorHandler?: (error: unknown) => TOutput
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    try {
      return await actionFn(input);
    } catch (error) {
      const actionName = actionFn.name || "anonymous action";
      console.error(`[${actionName}] Action failed:`, error);

      if (errorHandler) {
        return errorHandler(error);
      }

      throw error;
    }
  };
}
