import { describe, it, expect } from "vitest";
import {
  createPostSchema,
  postTitleSchema,
  postContentSchema,
  voteValueSchema,
  postSortSchema,
  updatePostSchema,
  deletePostSchema,
  votePostSchema,
} from "../post";

describe("Post Validation Schemas", () => {
  describe("postTitleSchema", () => {
    it("should accept valid titles", () => {
      const result = postTitleSchema.safeParse("This is a valid title");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("This is a valid title");
      }
    });

    it("should trim whitespace from titles", () => {
      const result = postTitleSchema.safeParse("  Title with spaces  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("Title with spaces");
      }
    });

    it("should reject titles shorter than 5 characters", () => {
      const result = postTitleSchema.safeParse("Hi");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Title must be at least 5 characters"
        );
      }
    });

    it("should reject titles longer than 300 characters", () => {
      const longTitle = "a".repeat(301);
      const result = postTitleSchema.safeParse(longTitle);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Title must be at most 300 characters"
        );
      }
    });

    it("should accept titles at exactly 5 characters", () => {
      const result = postTitleSchema.safeParse("Hello");
      expect(result.success).toBe(true);
    });

    it("should accept titles at exactly 300 characters", () => {
      const exactTitle = "a".repeat(300);
      const result = postTitleSchema.safeParse(exactTitle);
      expect(result.success).toBe(true);
    });
  });

  describe("postContentSchema", () => {
    it("should accept valid content", () => {
      const result = postContentSchema.safeParse(
        "This is valid post content that meets the minimum length."
      );
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from content", () => {
      const result = postContentSchema.safeParse(
        "  Content with spaces at edges  "
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("Content with spaces at edges");
      }
    });

    it("should reject content shorter than 10 characters", () => {
      const result = postContentSchema.safeParse("Short");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Content must be at least 10 characters"
        );
      }
    });

    it("should reject content longer than 40000 characters", () => {
      const longContent = "a".repeat(40001);
      const result = postContentSchema.safeParse(longContent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Content must be at most 40,000 characters"
        );
      }
    });
  });

  describe("voteValueSchema", () => {
    it("should accept upvote (1)", () => {
      const result = voteValueSchema.safeParse(1);
      expect(result.success).toBe(true);
    });

    it("should accept downvote (-1)", () => {
      const result = voteValueSchema.safeParse(-1);
      expect(result.success).toBe(true);
    });

    it("should accept neutral vote (0)", () => {
      const result = voteValueSchema.safeParse(0);
      expect(result.success).toBe(true);
    });

    it("should reject invalid vote values", () => {
      const result = voteValueSchema.safeParse(2);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer values", () => {
      const result = voteValueSchema.safeParse(0.5);
      expect(result.success).toBe(false);
    });
  });

  describe("postSortSchema", () => {
    it("should accept 'hot' sort", () => {
      const result = postSortSchema.safeParse("hot");
      expect(result.success).toBe(true);
    });

    it("should accept 'new' sort", () => {
      const result = postSortSchema.safeParse("new");
      expect(result.success).toBe(true);
    });

    it("should accept 'top' sort", () => {
      const result = postSortSchema.safeParse("top");
      expect(result.success).toBe(true);
    });

    it("should default to 'hot' when undefined", () => {
      const result = postSortSchema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hot");
      }
    });

    it("should reject invalid sort values", () => {
      const result = postSortSchema.safeParse("invalid");
      expect(result.success).toBe(false);
    });
  });

  describe("createPostSchema", () => {
    it("should accept valid post creation data", () => {
      const result = createPostSchema.safeParse({
        communityId: "community-123",
        title: "This is a test post",
        content: "This is the content of the test post which is long enough.",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing communityId", () => {
      const result = createPostSchema.safeParse({
        title: "This is a test post",
        content: "This is the content of the test post which is long enough.",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty communityId", () => {
      const result = createPostSchema.safeParse({
        communityId: "",
        title: "This is a test post",
        content: "This is the content of the test post which is long enough.",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updatePostSchema", () => {
    it("should accept valid update with both fields", () => {
      const result = updatePostSchema.safeParse({
        postId: "post-123",
        title: "Updated title here",
        content: "Updated content that is long enough to pass validation.",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept update with only title", () => {
      const result = updatePostSchema.safeParse({
        postId: "post-123",
        title: "Updated title only",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept update with only content", () => {
      const result = updatePostSchema.safeParse({
        postId: "post-123",
        content: "Updated content that is long enough to pass validation.",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing postId", () => {
      const result = updatePostSchema.safeParse({
        title: "Updated title",
        issueTagIds: ["tag-1"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("deletePostSchema", () => {
    it("should accept valid postId", () => {
      const result = deletePostSchema.safeParse({
        postId: "post-123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty postId", () => {
      const result = deletePostSchema.safeParse({
        postId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("votePostSchema", () => {
    it("should accept valid upvote", () => {
      const result = votePostSchema.safeParse({
        postId: "post-123",
        value: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid downvote", () => {
      const result = votePostSchema.safeParse({
        postId: "post-123",
        value: -1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept vote removal", () => {
      const result = votePostSchema.safeParse({
        postId: "post-123",
        value: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid vote value", () => {
      const result = votePostSchema.safeParse({
        postId: "post-123",
        value: 5,
      });
      expect(result.success).toBe(false);
    });
  });
});
