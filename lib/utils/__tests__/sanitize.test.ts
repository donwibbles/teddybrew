import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeRichText } from "../sanitize";

describe("Sanitize Utilities", () => {
  describe("sanitizeText", () => {
    it("should return empty string for null input", () => {
      expect(sanitizeText(null)).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(sanitizeText(undefined)).toBe("");
    });

    it("should return empty string for empty string input", () => {
      expect(sanitizeText("")).toBe("");
    });

    it("should return plain text unchanged", () => {
      const input = "Hello, this is plain text";
      expect(sanitizeText(input)).toBe("Hello, this is plain text");
    });

    it("should strip HTML tags", () => {
      const input = "<p>Hello <strong>World</strong></p>";
      expect(sanitizeText(input)).toBe("Hello World");
    });

    it("should prevent XSS with script tags", () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeText(input);
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
      expect(result).toBe("Hello");
    });

    it("should prevent XSS with event handlers", () => {
      const input = '<img src="x" onerror="alert(1)">Text';
      const result = sanitizeText(input);
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("<img");
      expect(result).toBe("Text");
    });

    it("should prevent XSS with javascript: protocol", () => {
      const input = '<a href="javascript:alert(1)">Click me</a>';
      const result = sanitizeText(input);
      expect(result).not.toContain("javascript:");
      expect(result).toBe("Click me");
    });

    it("should strip all HTML attributes", () => {
      const input = '<div class="test" id="myDiv">Content</div>';
      expect(sanitizeText(input)).toBe("Content");
    });

    it("should trim whitespace from result", () => {
      const input = "  <p>  Text with spaces  </p>  ";
      expect(sanitizeText(input)).toBe("Text with spaces");
    });

    it("should handle nested malicious tags", () => {
      const input =
        '<div><script><script>alert(1)</script></script>Safe text</div>';
      const result = sanitizeText(input);
      expect(result).not.toContain("<script>");
      expect(result).toBe("Safe text");
    });

    it("should handle encoded HTML entities in tags", () => {
      const input = "&lt;script&gt;alert(1)&lt;/script&gt;";
      const result = sanitizeText(input);
      // HTML-encoded entities are already safe - they won't execute as HTML
      // DOMPurify leaves them as-is since they're not actual tags
      expect(result).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    it("should handle SVG-based XSS attempts", () => {
      const input = '<svg onload="alert(1)">test</svg>';
      const result = sanitizeText(input);
      expect(result).not.toContain("onload");
      expect(result).not.toContain("<svg");
    });
  });

  describe("sanitizeRichText", () => {
    it("should return empty string for null input", () => {
      expect(sanitizeRichText(null)).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(sanitizeRichText(undefined)).toBe("");
    });

    it("should allow <b> tags", () => {
      const input = "<b>Bold text</b>";
      expect(sanitizeRichText(input)).toBe("<b>Bold text</b>");
    });

    it("should allow <i> tags", () => {
      const input = "<i>Italic text</i>";
      expect(sanitizeRichText(input)).toBe("<i>Italic text</i>");
    });

    it("should allow <em> tags", () => {
      const input = "<em>Emphasized text</em>";
      expect(sanitizeRichText(input)).toBe("<em>Emphasized text</em>");
    });

    it("should allow <strong> tags", () => {
      const input = "<strong>Strong text</strong>";
      expect(sanitizeRichText(input)).toBe("<strong>Strong text</strong>");
    });

    it("should allow <br> tags", () => {
      const input = "Line 1<br>Line 2";
      // DOMPurify may normalize <br> to <br />
      const result = sanitizeRichText(input);
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
      expect(result).toMatch(/<br\s*\/?>/);
    });

    it("should strip disallowed tags while keeping content", () => {
      const input = "<div><p>Text in paragraph</p></div>";
      expect(sanitizeRichText(input)).toBe("Text in paragraph");
    });

    it("should strip all attributes from allowed tags", () => {
      const input = '<b class="bold" style="color:red">Bold</b>';
      expect(sanitizeRichText(input)).toBe("<b>Bold</b>");
    });

    it("should prevent XSS even with allowed tags", () => {
      const input = '<b onclick="alert(1)">Click me</b>';
      expect(sanitizeRichText(input)).toBe("<b>Click me</b>");
    });

    it("should strip script tags", () => {
      const input = '<script>alert("XSS")</script><b>Safe</b>';
      const result = sanitizeRichText(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("<b>Safe</b>");
    });

    it("should handle mixed allowed and disallowed tags", () => {
      const input =
        "<div><strong>Important</strong> text with <span>span</span> and <em>emphasis</em></div>";
      const result = sanitizeRichText(input);
      expect(result).toContain("<strong>Important</strong>");
      expect(result).toContain("<em>emphasis</em>");
      expect(result).not.toContain("<div>");
      expect(result).not.toContain("<span>");
    });

    it("should trim whitespace from result", () => {
      const input = "  <b>Bold</b>  ";
      expect(sanitizeRichText(input)).toBe("<b>Bold</b>");
    });
  });
});
