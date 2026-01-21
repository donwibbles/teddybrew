import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize user input to prevent XSS attacks
 * Strips all HTML tags and returns plain text
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return "";

  // Strip all HTML tags, leaving only text content
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  }).trim();
}

/**
 * Sanitize user input but allow basic formatting
 * Useful for descriptions that might have simple formatting
 */
export function sanitizeRichText(input: string | undefined | null): string {
  if (!input) return "";

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "br"],
    ALLOWED_ATTR: [],
  }).trim();
}
