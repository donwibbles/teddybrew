import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy initialization to avoid issues with edge runtime
let _redis: Redis | null = null;
let _authRateLimiter: Ratelimit | null = null;
let _chatRateLimiter: Ratelimit | null = null;
let _reactionRateLimiter: Ratelimit | null = null;
let _postRateLimiter: Ratelimit | null = null;
let _commentRateLimiter: Ratelimit | null = null;
let _voteRateLimiter: Ratelimit | null = null;
let _eventRateLimiter: Ratelimit | null = null;
let _communityRateLimiter: Ratelimit | null = null;
let _membershipRateLimiter: Ratelimit | null = null;
let _profileRateLimiter: Ratelimit | null = null;
let _channelRateLimiter: Ratelimit | null = null;
let _documentRateLimiter: Ratelimit | null = null;
let _folderRateLimiter: Ratelimit | null = null;
let _rsvpRateLimiter: Ratelimit | null = null;
let _inviteRateLimiter: Ratelimit | null = null;
let _uploadRateLimiter: Ratelimit | null = null;

// Track whether we've already warned about Redis being unavailable
let _redisWarned = false;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!_redisWarned) {
      console.warn(
        "[SECURITY] Rate limiting disabled: Upstash Redis credentials not configured. " +
        "All requests will be allowed. Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production."
      );
      _redisWarned = true;
    }
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}

function getAuthRateLimiter(): Ratelimit | null {
  if (_authRateLimiter) return _authRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  _authRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "15 m"),
    analytics: true,
    prefix: "ratelimit:auth",
  });

  return _authRateLimiter;
}

function getChatRateLimiter(): Ratelimit | null {
  if (_chatRateLimiter) return _chatRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 1 message per second
  _chatRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, "1 s"),
    analytics: true,
    prefix: "ratelimit:chat",
  });

  return _chatRateLimiter;
}

function getReactionRateLimiter(): Ratelimit | null {
  if (_reactionRateLimiter) return _reactionRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 20 reactions per minute
  _reactionRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "ratelimit:reaction",
  });

  return _reactionRateLimiter;
}

function getPostRateLimiter(): Ratelimit | null {
  if (_postRateLimiter) return _postRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 1 post per minute
  _postRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, "1 m"),
    analytics: true,
    prefix: "ratelimit:post",
  });

  return _postRateLimiter;
}

function getCommentRateLimiter(): Ratelimit | null {
  if (_commentRateLimiter) return _commentRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 5 comments per minute
  _commentRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:comment",
  });

  return _commentRateLimiter;
}

function getVoteRateLimiter(): Ratelimit | null {
  if (_voteRateLimiter) return _voteRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 10 votes per minute
  _voteRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:vote",
  });

  return _voteRateLimiter;
}

function getEventRateLimiter(): Ratelimit | null {
  if (_eventRateLimiter) return _eventRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 5 events per hour
  _eventRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "ratelimit:event",
  });

  return _eventRateLimiter;
}

function getCommunityRateLimiter(): Ratelimit | null {
  if (_communityRateLimiter) return _communityRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 3 communities per hour
  _communityRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    analytics: true,
    prefix: "ratelimit:community",
  });

  return _communityRateLimiter;
}

function getMembershipRateLimiter(): Ratelimit | null {
  if (_membershipRateLimiter) return _membershipRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 10 joins per hour
  _membershipRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:membership",
  });

  return _membershipRateLimiter;
}

function getProfileRateLimiter(): Ratelimit | null {
  if (_profileRateLimiter) return _profileRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 10 profile updates per hour
  _profileRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:profile",
  });

  return _profileRateLimiter;
}

function getChannelRateLimiter(): Ratelimit | null {
  if (_channelRateLimiter) return _channelRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 5 channels per hour
  _channelRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    analytics: true,
    prefix: "ratelimit:channel",
  });

  return _channelRateLimiter;
}

function getDocumentRateLimiter(): Ratelimit | null {
  if (_documentRateLimiter) return _documentRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 10 documents per hour
  _documentRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:document",
  });

  return _documentRateLimiter;
}

function getFolderRateLimiter(): Ratelimit | null {
  if (_folderRateLimiter) return _folderRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 10 folders per hour
  _folderRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "ratelimit:folder",
  });

  return _folderRateLimiter;
}

function getRsvpRateLimiter(): Ratelimit | null {
  if (_rsvpRateLimiter) return _rsvpRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 20 RSVPs per hour
  _rsvpRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
    prefix: "ratelimit:rsvp",
  });

  return _rsvpRateLimiter;
}

function getInviteRateLimiter(): Ratelimit | null {
  if (_inviteRateLimiter) return _inviteRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 20 invites per hour
  _inviteRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
    prefix: "ratelimit:invite",
  });

  return _inviteRateLimiter;
}

function getUploadRateLimiter(): Ratelimit | null {
  if (_uploadRateLimiter) return _uploadRateLimiter;

  const redis = getRedis();
  if (!redis) return null;

  // 30 uploads per hour
  _uploadRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 h"),
    analytics: true,
    prefix: "ratelimit:upload",
  });

  return _uploadRateLimiter;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check if a request should be rate limited
 * Returns { success: boolean, remaining: number, reset: number }
 * If rate limiting is not configured, allows all requests
 */
export async function checkAuthRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const rateLimiter = getAuthRateLimiter();

  // If rate limiting isn't configured, allow all requests
  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  const result = await rateLimiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check chat message rate limit: 1 message per second
 */
export async function checkChatRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getChatRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 1000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check reaction rate limit: 20 reactions per minute
 */
export async function checkReactionRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getReactionRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check forum post rate limit: 1 post per minute
 */
export async function checkPostRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getPostRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check comment rate limit: 5 comments per minute
 */
export async function checkCommentRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getCommentRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check vote rate limit: 10 votes per minute
 */
export async function checkVoteRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getVoteRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check event rate limit: 5 events per hour
 */
export async function checkEventRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getEventRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check community rate limit: 3 communities per hour
 */
export async function checkCommunityRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getCommunityRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check membership rate limit: 10 joins per hour
 */
export async function checkMembershipRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getMembershipRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check profile rate limit: 10 updates per hour
 */
export async function checkProfileRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getProfileRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check channel rate limit: 5 channels per hour
 */
export async function checkChannelRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getChannelRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check document rate limit: 10 documents per hour
 */
export async function checkDocumentRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getDocumentRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check folder rate limit: 10 folders per hour
 */
export async function checkFolderRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getFolderRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check RSVP rate limit: 20 RSVPs per hour
 */
export async function checkRsvpRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getRsvpRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check invite rate limit: 20 invites per hour
 */
export async function checkInviteRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getInviteRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Check upload rate limit: 30 uploads per hour
 */
export async function checkUploadRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const rateLimiter = getUploadRateLimiter();

  if (!rateLimiter) {
    return {
      success: true,
      remaining: 999,
      reset: Date.now() + 3600000,
    };
  }

  const result = await rateLimiter.limit(userId);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

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
