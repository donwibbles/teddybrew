import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to create mock functions that are available when vi.mock factories run
const {
  mockCommunityFindUnique,
  mockCommunityCreate,
  mockCommunityUpdate,
  mockCommunityDelete,
  mockMemberCreate,
  mockChatChannelCreate,
  mockTransaction,
  mockVerifySession,
  mockCheckCommunityRateLimit,
} = vi.hoisted(() => ({
  mockCommunityFindUnique: vi.fn(),
  mockCommunityCreate: vi.fn(),
  mockCommunityUpdate: vi.fn(),
  mockCommunityDelete: vi.fn(),
  mockMemberCreate: vi.fn(),
  mockChatChannelCreate: vi.fn(),
  mockTransaction: vi.fn(),
  mockVerifySession: vi.fn(),
  mockCheckCommunityRateLimit: vi.fn(),
}));

// Mock dependencies
vi.mock("@/lib/dal", () => ({
  verifySession: mockVerifySession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    community: {
      findUnique: mockCommunityFindUnique,
      create: mockCommunityCreate,
      update: mockCommunityUpdate,
      delete: mockCommunityDelete,
    },
    member: {
      create: mockMemberCreate,
    },
    chatChannel: {
      create: mockChatChannelCreate,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkCommunityRateLimit: mockCheckCommunityRateLimit,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks are set up
import { createCommunity, updateCommunity, deleteCommunity } from "../community";

describe("Community Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockVerifySession.mockResolvedValue({ userId: "user-123" });
    mockCheckCommunityRateLimit.mockResolvedValue({ success: true });
  });

  describe("createCommunity", () => {
    it("should return error for unauthenticated user", async () => {
      mockVerifySession.mockRejectedValue(new Error("Unauthorized"));

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
      mockCheckCommunityRateLimit.mockResolvedValue({ success: false });

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
      mockCommunityFindUnique.mockResolvedValue({
        id: "existing-id",
      });

      const result = await createCommunity({
        name: "Test Community",
        slug: "test-community",
        type: "PUBLIC",
        isVirtual: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already taken");
      }
    });

    it("should create community with valid input", async () => {
      mockCommunityFindUnique.mockResolvedValue(null);
      mockTransaction.mockImplementation(async (fn) => {
        return fn({
          community: {
            create: vi.fn().mockResolvedValue({
              id: "new-community-id",
              slug: "test-community",
            }),
          },
          member: { create: vi.fn() },
          chatChannel: { create: vi.fn() },
        });
      });

      const result = await createCommunity({
        name: "Test Community",
        slug: "test-community",
        type: "PUBLIC",
        description: "A test community",
        isVirtual: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slug).toBe("test-community");
      }
    });
  });

  describe("updateCommunity", () => {
    it("should return error for non-existent community", async () => {
      mockCommunityFindUnique.mockResolvedValue(null);

      const result = await updateCommunity({
        communityId: "non-existent",
        name: "Updated Name",
        isVirtual: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error when user is not owner", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-id",
        slug: "test-community",
        ownerId: "other-user", // Different user
      });

      const result = await updateCommunity({
        communityId: "community-id",
        name: "Updated Name",
        isVirtual: true,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("owner");
      }
    });

    it("should update community when user is owner", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-id",
        slug: "test-community",
        ownerId: "user-123", // Same as authenticated user
      });
      mockCommunityUpdate.mockResolvedValue({});

      const result = await updateCommunity({
        communityId: "community-id",
        name: "Updated Name",
        isVirtual: true,
      });

      expect(result.success).toBe(true);
      expect(mockCommunityUpdate).toHaveBeenCalledWith({
        where: { id: "community-id" },
        data: expect.objectContaining({ name: "Updated Name" }),
      });
    });
  });

  describe("deleteCommunity", () => {
    it("should return error for non-existent community", async () => {
      mockCommunityFindUnique.mockResolvedValue(null);

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
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "other-user",
      });

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
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "user-123",
      });

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
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "user-123",
      });
      mockCommunityDelete.mockResolvedValue({});

      const result = await deleteCommunity({
        communityId: "community-id",
        confirmName: "Test Community",
      });

      expect(result.success).toBe(true);
      expect(mockCommunityDelete).toHaveBeenCalledWith({
        where: { id: "community-id" },
      });
    });

    it("should be case-insensitive for confirmation name", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-id",
        name: "Test Community",
        ownerId: "user-123",
      });
      mockCommunityDelete.mockResolvedValue({});

      const result = await deleteCommunity({
        communityId: "community-id",
        confirmName: "TEST COMMUNITY", // Different case
      });

      expect(result.success).toBe(true);
    });
  });
});
