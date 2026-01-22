import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCommunity, updateCommunity, deleteCommunity } from "../community";

// Mock dependencies
vi.mock("@/lib/dal", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    community: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    member: {
      create: vi.fn(),
    },
    chatChannel: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkCommunityRateLimit: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import mocks
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { checkCommunityRateLimit } from "@/lib/rate-limit";

describe("Community Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(verifySession).mockResolvedValue({ userId: "user-123" });
    vi.mocked(checkCommunityRateLimit).mockResolvedValue({ success: true });
  });

  describe("createCommunity", () => {
    it("should return error for unauthenticated user", async () => {
      vi.mocked(verifySession).mockRejectedValue(new Error("Unauthorized"));

      const result = await createCommunity({
        name: "Test Community",
        slug: "test-community",
        type: "PUBLIC",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Failed to create community");
      }
    });

    it("should return error when rate limited", async () => {
      vi.mocked(checkCommunityRateLimit).mockResolvedValue({ success: false });

      const result = await createCommunity({
        name: "Test Community",
        slug: "test-community",
        type: "PUBLIC",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("too quickly");
      }
    });

    it("should return error for invalid input", async () => {
      const result = await createCommunity({
        name: "", // Empty name should fail validation
        slug: "test",
        type: "PUBLIC",
      });

      expect(result.success).toBe(false);
    });

    it("should return error for invalid slug", async () => {
      const result = await createCommunity({
        name: "Test Community",
        slug: "INVALID SLUG WITH SPACES", // Invalid slug
        type: "PUBLIC",
      });

      expect(result.success).toBe(false);
    });

    it("should return error if slug is already taken", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "existing-id",
      } as any);

      const result = await createCommunity({
        name: "Test Community",
        slug: "test-community",
        type: "PUBLIC",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already taken");
      }
    });

    it("should create community with valid input", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn({
          community: {
            create: vi.fn().mockResolvedValue({
              id: "new-community-id",
              slug: "test-community",
            }),
          },
          member: { create: vi.fn() },
          chatChannel: { create: vi.fn() },
        } as any);
      });

      const result = await createCommunity({
        name: "Test Community",
        slug: "test-community",
        type: "PUBLIC",
        description: "A test community",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("test-community");
      }
    });
  });

  describe("updateCommunity", () => {
    it("should return error for non-existent community", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue(null);

      const result = await updateCommunity({
        communityId: "non-existent",
        name: "Updated Name",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error when user is not owner", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "community-id",
        slug: "test-community",
        ownerId: "other-user", // Different user
      } as any);

      const result = await updateCommunity({
        communityId: "community-id",
        name: "Updated Name",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("owner");
      }
    });

    it("should update community when user is owner", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "community-id",
        slug: "test-community",
        ownerId: "user-123", // Same as authenticated user
      } as any);
      vi.mocked(prisma.community.update).mockResolvedValue({} as any);

      const result = await updateCommunity({
        communityId: "community-id",
        name: "Updated Name",
      });

      expect(result.success).toBe(true);
      expect(prisma.community.update).toHaveBeenCalledWith({
        where: { id: "community-id" },
        data: expect.objectContaining({ name: "Updated Name" }),
      });
    });
  });

  describe("deleteCommunity", () => {
    it("should return error for non-existent community", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue(null);

      const result = await deleteCommunity({
        communityId: "non-existent",
        confirmName: "Test Community",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error when user is not owner", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "other-user",
      } as any);

      const result = await deleteCommunity({
        communityId: "community-id",
        confirmName: "Test Community",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("owner");
      }
    });

    it("should return error when confirmation name does not match", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "user-123",
      } as any);

      const result = await deleteCommunity({
        communityId: "community-id",
        confirmName: "Wrong Name",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not match");
      }
    });

    it("should delete community when confirmation matches", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "user-123",
      } as any);
      vi.mocked(prisma.community.delete).mockResolvedValue({} as any);

      const result = await deleteCommunity({
        communityId: "community-id",
        confirmName: "Test Community",
      });

      expect(result.success).toBe(true);
      expect(prisma.community.delete).toHaveBeenCalledWith({
        where: { id: "community-id" },
      });
    });

    it("should be case-insensitive for confirmation name", async () => {
      vi.mocked(prisma.community.findUnique).mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "user-123",
      } as any);
      vi.mocked(prisma.community.delete).mockResolvedValue({} as any);

      const result = await deleteCommunity({
        communityId: "community-id",
        confirmName: "TEST COMMUNITY", // Different case
      });

      expect(result.success).toBe(true);
    });
  });
});
