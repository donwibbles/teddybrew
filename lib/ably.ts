import Ably from "ably";

// Server-side Ably client singleton
const globalForAbly = globalThis as unknown as {
  ablyServer: Ably.Rest | undefined;
};

const ABLY_API_KEY = process.env.ABLY_API_KEY;

export function getAblyServer(): Ably.Rest {
  if (!ABLY_API_KEY) {
    throw new Error("ABLY_API_KEY environment variable is not set");
  }

  if (!globalForAbly.ablyServer) {
    globalForAbly.ablyServer = new Ably.Rest({ key: ABLY_API_KEY });
  }

  return globalForAbly.ablyServer;
}

/**
 * Generate a token request for client-side Ably authentication
 * Scoped to the user's community memberships
 */
export async function generateAblyTokenRequest(
  userId: string,
  communityIds: string[]
): Promise<Ably.TokenRequest> {
  const ably = getAblyServer();

  // Create capability object scoping access to user's communities
  const capability: { [key: string]: string[] } = {};

  // User's personal notification channel
  capability[`user:${userId}:notifications`] = ["subscribe"];

  for (const communityId of communityIds) {
    // Chat channels - subscribe and presence only
    // SECURITY: publish removed - all publishing is server-side to enforce
    // rate limits and RSVP checks
    capability[`community:${communityId}:chat:*`] = [
      "subscribe",
      "presence",
    ];
    // Presence channel - can subscribe and enter
    capability[`community:${communityId}:presence`] = [
      "subscribe",
      "presence",
    ];
    // Forum notifications - subscribe only
    capability[`community:${communityId}:forum`] = ["subscribe"];
  }

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: userId,
    capability: JSON.stringify(capability),
    ttl: 3600 * 1000, // 1 hour
  });

  return tokenRequest;
}

/**
 * Publish a message to an Ably channel (server-side)
 */
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown
): Promise<void> {
  const ably = getAblyServer();
  const channel = ably.channels.get(channelName);
  await channel.publish(eventName, data);
}

/**
 * Get channel names for a community
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
