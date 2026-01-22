/**
 * Client-safe Ably channel name helpers
 * These can be used on both server and client
 */

export function getChatChannelName(
  communityId: string,
  channelId: string
): string {
  return `community:${communityId}:chat:${channelId}`;
}

export function getPresenceChannelName(communityId: string): string {
  return `community:${communityId}:presence`;
}

export function getForumChannelName(communityId: string): string {
  return `community:${communityId}:forum`;
}

export function getUserNotificationChannel(userId: string): string {
  return `user:${userId}:notifications`;
}
