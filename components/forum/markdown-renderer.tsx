"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure marked
marked.setOptions({
  gfm: true, // GitHub flavored markdown
  breaks: true, // Convert \n to <br>
});

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    // Parse markdown to HTML
    const rawHtml = marked.parse(content, { async: false }) as string;

    // Sanitize HTML to prevent XSS
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "code",
        "pre",
        "blockquote",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "a",
        "img",
        "hr",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
      // Force links to open in new tab
      ADD_ATTR: ["target"],
    });

    // Add target="_blank" to all links for security
    return cleanHtml.replace(
      /<a /g,
      '<a target="_blank" rel="noopener noreferrer" '
    );
  }, [content]);

  return (
    <div
      className={`prose prose-neutral max-w-none
        prose-headings:font-semibold prose-headings:text-neutral-900
        prose-p:text-neutral-700 prose-p:leading-relaxed
        prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-neutral-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-neutral-900 prose-pre:text-neutral-100
        prose-blockquote:border-l-primary-500 prose-blockquote:text-neutral-600
        prose-img:rounded-lg
        ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface MarkdownPreviewProps {
  content: string;
  maxLength?: number;
}

export function MarkdownPreview({ content, maxLength = 200 }: MarkdownPreviewProps) {
  // Strip markdown and truncate for preview
  const preview = useMemo(() => {
    // Remove common markdown syntax
    let text = content
      .replace(/#{1,6}\s/g, "") // Headers
      .replace(/\*\*(.+?)\*\*/g, "$1") // Bold
      .replace(/\*(.+?)\*/g, "$1") // Italic
      .replace(/`(.+?)`/g, "$1") // Inline code
      .replace(/```[\s\S]*?```/g, "[code]") // Code blocks
      .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Links
      .replace(/!\[.*?\]\(.+?\)/g, "[image]") // Images
      .replace(/>\s/g, "") // Blockquotes
      .replace(/[-*+]\s/g, "") // List items
      .replace(/\d+\.\s/g, "") // Numbered lists
      .replace(/\n+/g, " ") // Newlines
      .trim();

    if (text.length > maxLength) {
      text = text.slice(0, maxLength).trim() + "...";
    }

    return text;
  }, [content, maxLength]);

  return (
    <p className="text-sm text-neutral-600 line-clamp-2">{preview}</p>
  );
}
