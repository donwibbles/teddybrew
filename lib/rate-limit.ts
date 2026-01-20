import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Rate limiter for authentication endpoints
 * 3 attempts per 15 minutes per IP
 */
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  analytics: true,
  prefix: "ratelimit:auth",
});

/**
 * General rate limiter for API endpoints
 * 10 requests per 10 seconds per IP
 */
export const generalRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "ratelimit:general",
});

/**
 * Check if a request should be rate limited
 * Returns { success: boolean, remaining: number, reset: number }
 */
export async function checkAuthRateLimit(identifier: string) {
  const result = await authRateLimiter.limit(identifier);
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
