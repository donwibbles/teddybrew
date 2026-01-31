import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemberRole, CommunityType } from "@prisma/client";

// Use vi.hoisted to create mock functions that are available when vi.mock factories run
const {
  mockCommunityFindUnique,
  mockMemberFindUnique,
  mockMemberCreate,
  mockMemberDelete,
  mockTransaction,
  mockVerifySession,
  mockCheckMembershipRateLimit,
} = vi.hoisted(() => ({
  mockCommunityFindUnique: vi.fn(),
  mockMemberFindUnique: vi.fn(),
  mockMemberCreate: vi.fn(),
  mockMemberDelete: vi.fn(),
  mockTransaction: vi.fn(),
  mockVerifySession: vi.fn(),
  mockCheckMembershipRateLimit: vi.fn(),
}));

// Mock server-only first
vi.mock("server-only", () => ({}));

// Mock all dependencies before imports
vi.mock("@/lib/dal", () => ({
  verifySession: mockVerifySession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    community: {
      findUnique: mockCommunityFindUnique,
      update: vi.fn().mockResolvedValue({}),
    },
    member: {
      findUnique: mockMemberFindUnique,
      create: mockMemberCreate,
      delete: mockMemberDelete,
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ name: "Test User" }),
    },
    event: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkMembershipRateLimit: mockCheckMembershipRateLimit,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock notification to avoid server-only import chain
vi.mock("../notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

// Import after all mocks are set up
import { joinCommunity, leaveCommunity, removeMember } from "../membership";

describe("Membership Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySession.mockResolvedValue({ userId: "user-123" });
    mockCheckMembershipRateLimit.mockResolvedValue({ success: true });
  });

  describe("joinCommunity", () => {
    it("should return error when rate limited", async () => {
      mockCheckMembershipRateLimit.mockResolvedValue({ success: false });

      const result = await joinCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("too quickly");
      }
    });

    it("should return error for non-existent community", async () => {
      mockCommunityFindUnique.mockResolvedValue(null);

      const result = await joinCommunity({
        communityId: "non-existent",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error for private community", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        type: CommunityType.PRIVATE,
      });

      const result = await joinCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("private");
      }
    });

    it("should return error if already a member", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        type: CommunityType.PUBLIC,
      });
      mockMemberFindUnique.mockResolvedValue({
        id: "membership-123",
      });

      const result = await joinCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already a member");
      }
    });

    it("should join public community successfully", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        type: CommunityType.PUBLIC,
      });
      mockMemberFindUnique.mockResolvedValue(null);
      mockMemberCreate.mockResolvedValue({});

      const result = await joinCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(true);
      expect(mockMemberCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          communityId: "community-123",
          role: MemberRole.MEMBER,
        },
      });
    });
  });

  describe("leaveCommunity", () => {
    it("should return error for non-existent community", async () => {
      mockCommunityFindUnique.mockResolvedValue(null);
      mockMemberFindUnique.mockResolvedValue(null);

      const result = await leaveCommunity({
        communityId: "non-existent",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error if not a member", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "owner-123",
      });
      mockMemberFindUnique.mockResolvedValue(null);

      const result = await leaveCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not a member");
      }
    });

    it("should return error if user is owner", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "user-123",
      });
      mockMemberFindUnique.mockResolvedValue({
        id: "membership-123",
        role: MemberRole.OWNER,
      });

      const result = await leaveCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("owner");
      }
    });

    it("should leave community successfully as member", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "owner-123",
      });
      mockMemberFindUnique.mockResolvedValue({
        id: "membership-123",
        role: MemberRole.MEMBER,
      });
      mockMemberDelete.mockResolvedValue({});

      const result = await leaveCommunity({
        communityId: "community-123",
      });

      expect(result.success).toBe(true);
      expect(mockMemberDelete).toHaveBeenCalledWith({
        where: { id: "membership-123" },
      });
    });
  });

  describe("removeMember", () => {
    it("should return error for non-existent community", async () => {
      mockCommunityFindUnique.mockResolvedValue(null);

      const result = await removeMember({
        communityId: "non-existent",
        memberId: "member-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error if user is not owner", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "other-user", // Different user
      });

      const result = await removeMember({
        communityId: "community-123",
        memberId: "member-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("owner");
      }
    });

    it("should return error for non-existent member", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "user-123",
      });
      mockMemberFindUnique.mockResolvedValue(null);

      const result = await removeMember({
        communityId: "community-123",
        memberId: "non-existent",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should return error when trying to remove owner", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "user-123",
      });
      mockMemberFindUnique.mockResolvedValue({
        id: "member-123",
        userId: "owner-user",
        role: MemberRole.OWNER,
        communityId: "community-123",
      });

      const result = await removeMember({
        communityId: "community-123",
        memberId: "member-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Cannot remove the community owner");
      }
    });

    it("should return error if member belongs to different community", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "user-123",
      });
      mockMemberFindUnique.mockResolvedValue({
        id: "member-123",
        userId: "other-user",
        role: MemberRole.MEMBER,
        communityId: "different-community", // Different community
      });

      const result = await removeMember({
        communityId: "community-123",
        memberId: "member-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("does not belong");
      }
    });

    it("should remove member successfully", async () => {
      mockCommunityFindUnique.mockResolvedValue({
        id: "community-123",
        slug: "test-community",
        ownerId: "user-123",
      });
      mockMemberFindUnique.mockResolvedValue({
        id: "member-123",
        userId: "member-user",
        role: MemberRole.MEMBER,
        communityId: "community-123",
      });
      mockTransaction.mockImplementation(async (fn) => {
        return fn({
          event: {
            updateMany: vi.fn(),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn(),
          },
          member: {
            delete: vi.fn(),
          },
        });
      });

      const result = await removeMember({
        communityId: "community-123",
        memberId: "member-123",
      });

      expect(result.success).toBe(true);
    });
  });
});
