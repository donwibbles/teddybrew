import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkAuthRateLimit,
  checkChatRateLimit,
  checkPostRateLimit,
  checkCommentRateLimit,
  checkVoteRateLimit,
  checkEventRateLimit,
  checkCommunityRateLimit,
  checkMembershipRateLimit,
  checkProfileRateLimit,
  checkChannelRateLimit,
  getClientIp,
} from "../rate-limit";

// Store original env
const originalEnv = { ...process.env };

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear env vars to test fallback behavior
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe("Fallback behavior (no Redis configured)", () => {
    it("checkAuthRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkAuthRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkChatRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkChatRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkPostRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkPostRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkCommentRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkCommentRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkVoteRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkVoteRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkEventRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkEventRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkCommunityRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkCommunityRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkMembershipRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkMembershipRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkProfileRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkProfileRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });

    it("checkChannelRateLimit should allow all requests when Redis is not configured", async () => {
      const result = await checkChannelRateLimit("test-user");
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(999);
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from fly-client-ip header", () => {
      const headers = new Headers({
        "fly-client-ip": "1.2.3.4",
      });
      expect(getClientIp(headers)).toBe("1.2.3.4");
    });

    it("should extract first IP from x-forwarded-for header", () => {
      const headers = new Headers({
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      });
      expect(getClientIp(headers)).toBe("1.2.3.4");
    });

    it("should extract IP from x-real-ip header", () => {
      const headers = new Headers({
        "x-real-ip": "1.2.3.4",
      });
      expect(getClientIp(headers)).toBe("1.2.3.4");
    });

    it("should return localhost when no IP headers present", () => {
      const headers = new Headers();
      expect(getClientIp(headers)).toBe("127.0.0.1");
    });

    it("should prioritize fly-client-ip over other headers", () => {
      const headers = new Headers({
        "fly-client-ip": "1.1.1.1",
        "x-forwarded-for": "2.2.2.2",
        "x-real-ip": "3.3.3.3",
      });
      expect(getClientIp(headers)).toBe("1.1.1.1");
    });

    it("should fallback to x-forwarded-for when fly-client-ip not present", () => {
      const headers = new Headers({
        "x-forwarded-for": "2.2.2.2",
        "x-real-ip": "3.3.3.3",
      });
      expect(getClientIp(headers)).toBe("2.2.2.2");
    });

    it("should trim whitespace from forwarded IPs", () => {
      const headers = new Headers({
        "x-forwarded-for": "  1.2.3.4  , 5.6.7.8",
      });
      expect(getClientIp(headers)).toBe("1.2.3.4");
    });
  });

  describe("Rate limit result structure", () => {
    it("should return success, remaining, and reset fields", async () => {
      const result = await checkChatRateLimit("test-user");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("remaining");
      expect(result).toHaveProperty("reset");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.remaining).toBe("number");
      expect(typeof result.reset).toBe("number");
    });

    it("should return reset time in the future", async () => {
      const before = Date.now();
      const result = await checkChatRateLimit("test-user");
      expect(result.reset).toBeGreaterThanOrEqual(before);
    });
  });
});
