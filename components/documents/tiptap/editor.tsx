"use client";

import { useState, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { getExtensions, editorProseStyles } from "./extensions";
import { Toolbar } from "./toolbar";
import { LinkDialog } from "./link-dialog";
import { ImageDialog } from "./image-dialog";

interface TipTapEditorProps {
  content: JSONContent;
  onChange: (content: JSONContent, html: string) => void;
  placeholder?: string;
  communityId: string;
  documentId?: string;
  disabled?: boolean;
  className?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder,
  communityId,
  documentId,
  disabled = false,
  className,
}: TipTapEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: getExtensions(placeholder),
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      onChange(json, html);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  // Update editor content when prop changes (e.g., version restore)
  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(content);
      if (currentContent !== newContent) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Update editable state when disabled changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const handleLinkClick = useCallback(() => {
    setLinkDialogOpen(true);
  }, []);

  const handleImageClick = useCallback(() => {
    setImageDialogOpen(true);
  }, []);

  return (
    <>
      <style jsx global>
        {editorProseStyles}
      </style>

      <div
        className={cn(
          "overflow-hidden rounded-lg border border-neutral-200 bg-white",
          disabled && "opacity-60",
          className
        )}
      >
        <Toolbar
          editor={editor}
          onLinkClick={handleLinkClick}
          onImageClick={handleImageClick}
          disabled={disabled}
        />
        <EditorContent editor={editor} />
      </div>

      <LinkDialog
        editor={editor}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />

      <ImageDialog
        editor={editor}
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        communityId={communityId}
        documentId={documentId}
      />
    </>
  );
}

/**
 * Read-only TipTap viewer
 */
interface TipTapViewerProps {
  content: JSONContent;
  className?: string;
}

export function TipTapViewer({ content, className }: TipTapViewerProps) {
  const editor = useEditor({
    extensions: getExtensions(),
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  return (
    <>
      <style jsx global>
        {editorProseStyles}
      </style>
      <div className={cn("prose prose-neutral max-w-none", className)}>
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

// Export default extensions for use elsewhere
export { getExtensions };
