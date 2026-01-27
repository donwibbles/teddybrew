"use server";

import { verifySession } from "@/lib/dal";
import { getUserCommunityActivity } from "@/lib/db/activity";
import { captureServerError } from "@/lib/sentry";

/**
 * Get more activity items for infinite scroll
 */
export async function getMoreActivity(cursorIso?: string) {
  try {
    const { userId } = await verifySession();

    const cursor = cursorIso ? new Date(cursorIso) : undefined;
    const result = await getUserCommunityActivity(userId, 20, cursor);

    return {
      items: result.items,
      nextCursor: result.nextCursor?.toISOString(),
      hasMore: result.hasMore,
    };
  } catch (error) {
    captureServerError("activity.getMore", error);
    return { items: [], hasMore: false };
  }
}
