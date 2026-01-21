import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy initialization to avoid issues with edge runtime
let _redis: Redis | null = null;
let _authRateLimiter: Ratelimit | null = null;

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

/**
 * Check if a request should be rate limited
 * Returns { success: boolean, remaining: number, reset: number }
 * If rate limiting is not configured, allows all requests
 */
export async function checkAuthRateLimit(identifier: string) {
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
