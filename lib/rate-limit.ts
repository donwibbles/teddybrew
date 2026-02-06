import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

// Lazy initialization to avoid issues with edge runtime
let _redis: Redis | null = null;

// Track whether we've already warned about Redis being unavailable
let _redisWarned = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!_redisWarned) {
      const message =
        "[SECURITY] Rate limiting disabled: Upstash Redis credentials not configured. " +
        "All requests will be allowed. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.";
      console.warn(message);
      if (env.NODE_ENV !== "development") {
        Sentry.captureMessage(message, "warning");
      }
      _redisWarned = true;
    }
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

interface RateLimitConfig {
  requests: number;
  window: Parameters<typeof Ratelimit.slidingWindow>[1];
  prefix: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Create a lazily-initialized rate limiter getter.
 * Each call site keeps its own `_cached` ref so the limiter is created once.
 */
function createRateLimiter(
  config: RateLimitConfig,
  cached: { current: Ratelimit | null }
): () => Ratelimit | null {
  return () => {
    if (cached.current) return cached.current;

    const redis = getRedis();
    if (!redis) return null;

    cached.current = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: config.prefix,
    });

    return cached.current;
  };
}

/**
 * Create an exported check function from a limiter getter.
 */
function createCheckRateLimit(
  getLimiter: () => Ratelimit | null,
  fallbackReset: number
): (identifier: string) => Promise<RateLimitResult> {
  return async (identifier: string) => {
    const rateLimiter = getLimiter();

    if (!rateLimiter) {
      return {
        success: true,
        remaining: 999,
        reset: Date.now() + fallbackReset,
      };
    }

    const result = await rateLimiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  };
}

// --- Rate limiter definitions ---

const _authCache = { current: null as Ratelimit | null };
const getAuthRateLimiter = createRateLimiter(
  { requests: 3, window: "15 m", prefix: "ratelimit:auth" },
  _authCache
);

const _chatCache = { current: null as Ratelimit | null };
const getChatRateLimiter = createRateLimiter(
  { requests: 1, window: "1 s", prefix: "ratelimit:chat" },
  _chatCache
);

const _reactionCache = { current: null as Ratelimit | null };
const getReactionRateLimiter = createRateLimiter(
  { requests: 20, window: "1 m", prefix: "ratelimit:reaction" },
  _reactionCache
);

const _postCache = { current: null as Ratelimit | null };
const getPostRateLimiter = createRateLimiter(
  { requests: 1, window: "1 m", prefix: "ratelimit:post" },
  _postCache
);

const _commentCache = { current: null as Ratelimit | null };
const getCommentRateLimiter = createRateLimiter(
  { requests: 5, window: "1 m", prefix: "ratelimit:comment" },
  _commentCache
);

const _voteCache = { current: null as Ratelimit | null };
const getVoteRateLimiter = createRateLimiter(
  { requests: 10, window: "1 m", prefix: "ratelimit:vote" },
  _voteCache
);

const _eventCache = { current: null as Ratelimit | null };
const getEventRateLimiter = createRateLimiter(
  { requests: 5, window: "1 h", prefix: "ratelimit:event" },
  _eventCache
);

const _communityCache = { current: null as Ratelimit | null };
const getCommunityRateLimiter = createRateLimiter(
  { requests: 3, window: "1 h", prefix: "ratelimit:community" },
  _communityCache
);

const _membershipCache = { current: null as Ratelimit | null };
const getMembershipRateLimiter = createRateLimiter(
  { requests: 10, window: "1 h", prefix: "ratelimit:membership" },
  _membershipCache
);

const _profileCache = { current: null as Ratelimit | null };
const getProfileRateLimiter = createRateLimiter(
  { requests: 10, window: "1 h", prefix: "ratelimit:profile" },
  _profileCache
);

const _channelCache = { current: null as Ratelimit | null };
const getChannelRateLimiter = createRateLimiter(
  { requests: 5, window: "1 h", prefix: "ratelimit:channel" },
  _channelCache
);

const _documentCache = { current: null as Ratelimit | null };
const getDocumentRateLimiter = createRateLimiter(
  { requests: 10, window: "1 h", prefix: "ratelimit:document" },
  _documentCache
);

const _folderCache = { current: null as Ratelimit | null };
const getFolderRateLimiter = createRateLimiter(
  { requests: 10, window: "1 h", prefix: "ratelimit:folder" },
  _folderCache
);

const _rsvpCache = { current: null as Ratelimit | null };
const getRsvpRateLimiter = createRateLimiter(
  { requests: 20, window: "1 h", prefix: "ratelimit:rsvp" },
  _rsvpCache
);

const _inviteCache = { current: null as Ratelimit | null };
const getInviteRateLimiter = createRateLimiter(
  { requests: 20, window: "1 h", prefix: "ratelimit:invite" },
  _inviteCache
);

const _uploadCache = { current: null as Ratelimit | null };
const getUploadRateLimiter = createRateLimiter(
  { requests: 30, window: "1 h", prefix: "ratelimit:upload" },
  _uploadCache
);

// --- Exported check functions (same signatures as before) ---

/** Check auth rate limit: 3 attempts per 15 minutes */
export const checkAuthRateLimit = createCheckRateLimit(getAuthRateLimiter, 60000);

/** Check chat message rate limit: 1 message per second */
export const checkChatRateLimit = createCheckRateLimit(getChatRateLimiter, 1000);

/** Check reaction rate limit: 20 reactions per minute */
export const checkReactionRateLimit = createCheckRateLimit(getReactionRateLimiter, 60000);

/** Check forum post rate limit: 1 post per minute */
export const checkPostRateLimit = createCheckRateLimit(getPostRateLimiter, 60000);

/** Check comment rate limit: 5 comments per minute */
export const checkCommentRateLimit = createCheckRateLimit(getCommentRateLimiter, 60000);

/** Check vote rate limit: 10 votes per minute */
export const checkVoteRateLimit = createCheckRateLimit(getVoteRateLimiter, 60000);

/** Check event rate limit: 5 events per hour */
export const checkEventRateLimit = createCheckRateLimit(getEventRateLimiter, 3600000);

/** Check community rate limit: 3 communities per hour */
export const checkCommunityRateLimit = createCheckRateLimit(getCommunityRateLimiter, 3600000);

/** Check membership rate limit: 10 joins per hour */
export const checkMembershipRateLimit = createCheckRateLimit(getMembershipRateLimiter, 3600000);

/** Check profile rate limit: 10 updates per hour */
export const checkProfileRateLimit = createCheckRateLimit(getProfileRateLimiter, 3600000);

/** Check channel rate limit: 5 channels per hour */
export const checkChannelRateLimit = createCheckRateLimit(getChannelRateLimiter, 3600000);

/** Check document rate limit: 10 documents per hour */
export const checkDocumentRateLimit = createCheckRateLimit(getDocumentRateLimiter, 3600000);

/** Check folder rate limit: 10 folders per hour */
export const checkFolderRateLimit = createCheckRateLimit(getFolderRateLimiter, 3600000);

/** Check RSVP rate limit: 20 RSVPs per hour */
export const checkRsvpRateLimit = createCheckRateLimit(getRsvpRateLimiter, 3600000);

/** Check invite rate limit: 20 invites per hour */
export const checkInviteRateLimit = createCheckRateLimit(getInviteRateLimiter, 3600000);

/** Check upload rate limit: 30 uploads per hour */
export const checkUploadRateLimit = createCheckRateLimit(getUploadRateLimiter, 3600000);

/**
 * Get client IP from request headers
 * Works with Fly.io and other proxies
 */
export function getClientIp(headers: Headers): string {
  // Fly.io uses fly-client-ip
  const flyClientIp = headers.get("fly-client-ip");
  if (flyClientIp) return flyClientIp;

  // Standard forwarded header
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Real IP header (nginx)
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  // Fallback for local development
  return "127.0.0.1";
}
