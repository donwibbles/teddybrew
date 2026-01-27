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

// Prose styles matching the document TipTap viewer
const proseStyles = `
  .forum-prose h1 {
    font-size: 2em;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    color: rgb(23 23 23);
  }
  .forum-prose h2 {
    font-size: 1.5em;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
    color: rgb(23 23 23);
  }
  .forum-prose h3 {
    font-size: 1.25em;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1em;
    margin-bottom: 0.5em;
    color: rgb(23 23 23);
  }
  .forum-prose h4 {
    font-size: 1.1em;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1em;
    margin-bottom: 0.5em;
    color: rgb(23 23 23);
  }
  .forum-prose p {
    color: rgb(64 64 64);
    line-height: 1.75;
    margin-top: 0.75em;
    margin-bottom: 0.75em;
  }
  .forum-prose a {
    color: rgb(194 116 41);
    text-decoration: underline;
    cursor: pointer;
  }
  .forum-prose a:hover {
    color: rgb(163 88 13);
  }
  .forum-prose code {
    background-color: rgb(245 245 245);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.875em;
  }
  .forum-prose pre {
    background-color: rgb(245 245 245);
    border-radius: 0.375rem;
    padding: 1rem;
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 0.875em;
    margin: 1em 0;
  }
  .forum-prose pre code {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
  }
  .forum-prose blockquote {
    border-left: 4px solid rgb(212 212 212);
    padding-left: 1rem;
    font-style: italic;
    color: rgb(82 82 82);
    margin: 1em 0;
  }
  .forum-prose ul,
  .forum-prose ol {
    padding-left: 1.5em;
    margin: 0.75em 0;
  }
  .forum-prose ul {
    list-style-type: disc;
  }
  .forum-prose ol {
    list-style-type: decimal;
  }
  .forum-prose li {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
    color: rgb(64 64 64);
  }
  .forum-prose img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
    border-radius: 0.5rem;
  }
  .forum-prose table {
    border-collapse: collapse;
    margin: 1em 0;
    overflow: hidden;
    width: 100%;
  }
  .forum-prose table td,
  .forum-prose table th {
    border: 1px solid rgb(229 231 235);
    padding: 0.5rem;
    vertical-align: top;
  }
  .forum-prose table th {
    background-color: rgb(249 250 251);
    font-weight: 600;
  }
  .forum-prose hr {
    border: none;
    border-top: 2px solid rgb(229 231 235);
    margin: 2em 0;
  }
`;

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
    <>
      <style jsx global>{proseStyles}</style>
      <div
        className={`forum-prose max-w-none ${className || ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
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
