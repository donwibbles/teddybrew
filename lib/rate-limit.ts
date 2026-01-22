import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy initialization to avoid issues with edge runtime
let _redis: Redis | null = null;
let _authRateLimiter: Ratelimit | null = null;
let _chatRateLimiter: Ratelimit | null = null;
let _postRateLimiter: Ratelimit | null = null;
let _commentRateLimiter: Ratelimit | null = null;
let _voteRateLimiter: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error("Upstash Redis credentials not configured");
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
