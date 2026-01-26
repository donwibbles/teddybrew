import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";

/**
 * TipTap extensions configuration for the document editor
 */
export function getExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4],
      },
      codeBlock: {
        HTMLAttributes: {
          class: "bg-neutral-100 rounded-md p-4 font-mono text-sm overflow-x-auto",
        },
      },
      blockquote: {
        HTMLAttributes: {
          class: "border-l-4 border-neutral-300 pl-4 italic text-neutral-600",
        },
      },
      code: {
        HTMLAttributes: {
          class: "bg-neutral-100 rounded px-1.5 py-0.5 font-mono text-sm",
        },
      },
    }),
    Placeholder.configure({
      placeholder: placeholder || "Start writing your document...",
      emptyEditorClass: "is-editor-empty",
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: "text-primary-600 hover:text-primary-700 underline cursor-pointer",
        rel: "noopener noreferrer nofollow",
      },
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: {
        class: "rounded-lg max-w-full h-auto mx-auto",
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: "border-collapse table-auto w-full",
      },
    }),
    TableRow.configure({
      HTMLAttributes: {
        class: "border-b border-neutral-200",
      },
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: "border border-neutral-200 p-2 min-w-[100px]",
      },
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: "border border-neutral-200 p-2 min-w-[100px] bg-neutral-50 font-semibold",
      },
    }),
    TaskList.configure({
      HTMLAttributes: {
        class: "list-none pl-0",
      },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class: "flex items-start gap-2",
      },
    }),
    Highlight.configure({
      multicolor: false,
      HTMLAttributes: {
        class: "bg-yellow-200 rounded px-0.5",
      },
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Underline,
  ];
}

/**
 * Prose styles for the editor content
 */
export const editorProseStyles = `
  .ProseMirror {
    outline: none;
    min-height: 300px;
  }

  .ProseMirror > * + * {
    margin-top: 0.75em;
  }

  .ProseMirror h1 {
    font-size: 2em;
    font-weight: 700;
    line-height: 1.2;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .ProseMirror h2 {
    font-size: 1.5em;
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.25em;
    margin-bottom: 0.5em;
  }

  .ProseMirror h3 {
    font-size: 1.25em;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .ProseMirror h4 {
    font-size: 1.1em;
    font-weight: 600;
    line-height: 1.4;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.5em;
  }

  .ProseMirror ul {
    list-style-type: disc;
  }

  .ProseMirror ol {
    list-style-type: decimal;
  }

  .ProseMirror li {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }

  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
  }

  .ProseMirror img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
  }

  .ProseMirror table {
    border-collapse: collapse;
    margin: 1em 0;
    overflow: hidden;
    width: 100%;
  }

  .ProseMirror table td,
  .ProseMirror table th {
    border: 1px solid #e5e7eb;
    padding: 0.5rem;
    position: relative;
    vertical-align: top;
  }

  .ProseMirror table th {
    background-color: #f9fafb;
    font-weight: 600;
  }

  .ProseMirror .tableWrapper {
    overflow-x: auto;
  }

  .ProseMirror hr {
    border: none;
    border-top: 2px solid #e5e7eb;
    margin: 2em 0;
  }

  .ProseMirror ul[data-type="taskList"] {
    list-style: none;
    padding: 0;
  }

  .ProseMirror ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .ProseMirror ul[data-type="taskList"] li label {
    display: flex;
    align-items: center;
  }

  .ProseMirror ul[data-type="taskList"] li label input[type="checkbox"] {
    margin-right: 0.5rem;
    cursor: pointer;
  }

  .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p {
    text-decoration: line-through;
    color: #9ca3af;
  }
`;
