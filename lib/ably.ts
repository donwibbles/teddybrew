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
 * Scoped to the user's community memberships and RSVP'd event channels
 *
 * SECURITY: Chat channel access is granular:
 * - General community channels: all members have access
 * - Event channels: only users who RSVP'd GOING have access
 */
export async function generateAblyTokenRequest(
  userId: string,
  communityIds: string[],
  generalChannelsByCommunity: Map<string, Set<string>>,
  eventChannelsByCommunity: Map<string, Set<string>>
): Promise<Ably.TokenRequest> {
  const ably = getAblyServer();

  // Create capability object scoping access to user's communities
  const capability: { [key: string]: string[] } = {};

  // User's personal notification channel
  capability[`user:${userId}:notifications`] = ["subscribe"];

  for (const communityId of communityIds) {
    // Presence channel - can subscribe and enter
    capability[`community:${communityId}:presence`] = [
      "subscribe",
      "presence",
    ];
    // Forum notifications - subscribe only
    capability[`community:${communityId}:forum`] = ["subscribe"];
    // Document channels - subscribe and presence for collaboration
    capability[`community:${communityId}:document:*`] = [
      "subscribe",
      "presence",
    ];

    // Grant access to general (non-event) chat channels
    const generalChannels = generalChannelsByCommunity.get(communityId);
    if (generalChannels) {
      for (const channelId of generalChannels) {
        capability[`community:${communityId}:chat:${channelId}`] = [
          "subscribe",
          "presence",
        ];
      }
    }

    // Grant access to event chat channels only where user has RSVP'd
    const eventChannels = eventChannelsByCommunity.get(communityId);
    if (eventChannels) {
      for (const channelId of eventChannels) {
        capability[`community:${communityId}:chat:${channelId}`] = [
          "subscribe",
          "presence",
        ];
      }
    }
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

export function getDocumentChannelName(communityId: string, documentId: string): string {
  return `community:${communityId}:document:${documentId}`;
}
