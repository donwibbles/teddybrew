"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import {
  getNotifications as getNotificationsDb,
  getUnreadNotificationCount,
  markNotificationAsRead as markAsReadDb,
  markAllNotificationsAsRead as markAllAsReadDb,
  createNotification as createNotificationDb,
} from "@/lib/db/notifications";
import { publishToChannel, getUserNotificationChannel } from "@/lib/ably";
import { NotificationType } from "@prisma/client";
import type { ActionResult } from "./community";

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit: number = 20, includeRead: boolean = true) {
  try {
    const { userId } = await verifySession();
    const notifications = await getNotificationsDb(userId, limit, includeRead);
    return notifications;
  } catch {
    return [];
  }
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const { userId } = await verifySession();
    return await getUnreadNotificationCount(userId);
  } catch {
    return 0;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();
    await markAsReadDb(notificationId, userId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();
    await markAllAsReadDb(userId);
    revalidatePath("/notifications");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false, error: "Failed to mark all notifications as read" };
  }
}

/**
 * Internal helper to send a notification to a user
 * This is called by other actions (comment, post, membership, etc.)
 */
export async function sendNotification(data: {
  type: NotificationType;
  userId: string;
  title: string;
  message?: string;
  link?: string;
}): Promise<void> {
  try {
    // Don't notify user about their own actions
    const session = await verifySession().catch(() => null);
    if (session?.userId === data.userId) {
      return;
    }

    // Create notification in database
    const notification = await createNotificationDb(data);

    // Publish to Ably for real-time updates
    try {
      await publishToChannel(
        getUserNotificationChannel(data.userId),
        "new-notification",
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          createdAt: notification.createdAt.toISOString(),
        }
      );
    } catch (err) {
      // Log but don't fail - notification is already saved
      console.error("Failed to publish notification to Ably:", err);
    }
  } catch (error) {
    // Log but don't fail - notifications are not critical
    console.error("Failed to send notification:", error);
  }
}
