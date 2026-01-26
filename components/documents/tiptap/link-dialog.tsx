"use client";

import { useState, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LinkDialogProps {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkDialog({ editor, open, onOpenChange }: LinkDialogProps) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  // When dialog opens, populate with existing link if any
  useEffect(() => {
    if (open && editor) {
      const { href } = editor.getAttributes("link");
      setUrl(href || "");

      // Get selected text
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      setText(selectedText || "");
    }
  }, [open, editor]);

  const handleSetLink = useCallback(() => {
    if (!editor) return;

    // Validate URL
    let finalUrl = url.trim();
    if (finalUrl && !finalUrl.match(/^https?:\/\//)) {
      finalUrl = `https://${finalUrl}`;
    }

    if (finalUrl) {
      // If there's text to replace or insert
      if (text && text !== editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        " "
      )) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .insertContent(text)
          .setLink({ href: finalUrl })
          .run();
      } else {
        // Just set the link on existing selection
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: finalUrl })
          .run();
      }
    }

    onOpenChange(false);
    setUrl("");
    setText("");
  }, [editor, url, text, onOpenChange]);

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onOpenChange(false);
    setUrl("");
    setText("");
  }, [editor, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSetLink();
      }
    },
    [handleSetLink]
  );

  const hasExistingLink = editor?.isActive("link");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {hasExistingLink ? "Edit Link" : "Insert Link"}
          </DialogTitle>
          <DialogDescription>
            {hasExistingLink
              ? "Edit the link URL or remove it."
              : "Enter the URL for the link."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-text">Text (optional)</Label>
            <Input
              id="link-text"
              type="text"
              placeholder="Link text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-neutral-500">
              Leave empty to use the selected text
            </p>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {hasExistingLink && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveLink}
              className="w-full sm:w-auto"
            >
              <Unlink className="mr-2 h-4 w-4" />
              Remove Link
            </Button>
          )}
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSetLink}
              disabled={!url.trim()}
              className="flex-1 sm:flex-none"
            >
              {hasExistingLink ? "Update" : "Insert"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
