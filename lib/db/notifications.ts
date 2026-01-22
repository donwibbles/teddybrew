import "server-only";

import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

/**
 * Notification database queries
 */

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  limit: number = 20,
  includeRead: boolean = false
) {
  return await prisma.notification.findMany({
    where: {
      userId,
      ...(includeRead ? {} : { isRead: false }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * Create a notification
 */
export async function createNotification(data: {
  type: NotificationType;
  userId: string;
  title: string;
  message?: string;
  link?: string;
}) {
  return await prisma.notification.create({
    data: {
      type: data.type,
      userId: data.userId,
      title: data.title,
      message: data.message,
      link: data.link,
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns the notification
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

/**
 * Delete old read notifications (cleanup utility)
 */
export async function deleteOldNotifications(userId: string, olderThanDays: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  return await prisma.notification.deleteMany({
    where: {
      userId,
      isRead: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
  });
}
