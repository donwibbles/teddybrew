"use client";

import { useState, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { ImageIcon, Upload, Link2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPresignedUploadUrl } from "@/lib/actions/upload";
import { uploadConfigs } from "@/lib/upload";

interface ImageDialogProps {
  editor: Editor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  documentId?: string;
}

type TabType = "upload" | "url";

export function ImageDialog({
  editor,
  open,
  onOpenChange,
  communityId,
  documentId,
}: ImageDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [url, setUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = uploadConfigs.document;

  const resetState = useCallback(() => {
    setUrl("");
    setError(null);
    setPreview(null);
    setIsUploading(false);
    setActiveTab("upload");
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        resetState();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, resetState]
  );

  const handleInsertFromUrl = useCallback(() => {
    if (!editor || !url.trim()) return;

    // Validate URL format
    const trimmedUrl = url.trim();
    if (!trimmedUrl.match(/^https?:\/\/.+/)) {
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    editor.chain().focus().setImage({ src: trimmedUrl }).run();
    handleOpenChange(false);
  }, [editor, url, handleOpenChange]);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    // Client-side validation
    if (!config.allowedTypes.includes(file.type)) {
      setError("Invalid file type. Please upload JPEG, PNG, GIF, or WebP.");
      return;
    }

    if (file.size > config.maxSizeMB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${config.maxSizeMB}MB.`);
      return;
    }

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setIsUploading(true);

    try {
      const entityId = documentId
        ? `${communityId}/${documentId}`
        : communityId;

      // Get presigned URL
      const result = await getPresignedUploadUrl({
        type: "document",
        entityId,
        contentType: file.type,
        sizeBytes: file.size,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Upload directly to B2
      const uploadResponse = await fetch(result.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Insert image into editor
      if (editor) {
        editor.chain().focus().setImage({ src: result.data.publicUrl }).run();
      }

      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
    }
  }, [editor, communityId, documentId, config, handleOpenChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Insert Image
          </DialogTitle>
          <DialogDescription>
            Upload an image or paste a URL.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === "upload"
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-foreground-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload className="mr-2 inline h-4 w-4" />
            Upload
          </button>
          <button
            type="button"
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              activeTab === "url"
                ? "border-b-2 border-primary-500 text-primary-600"
                : "text-foreground-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("url")}
          >
            <Link2 className="mr-2 inline h-4 w-4" />
            URL
          </button>
        </div>

        <div className="py-4">
          {activeTab === "upload" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={config.allowedTypes.join(",")}
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />

              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 w-full rounded-lg object-contain"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                      <LoadingSpinner
                        size="lg"
                        className="border-white border-t-primary-400"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background-muted px-6 py-10 transition-colors hover:border-primary-400 hover:bg-background-hover"
                >
                  <Upload className="h-10 w-10 text-foreground-muted" />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    PNG, JPG, GIF, or WebP up to {config.maxSizeMB}MB
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleInsertFromUrl();
                    }
                  }}
                  autoFocus
                />
              </div>

              {url && url.match(/^https?:\/\/.+/) && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <img
                    src={url}
                    alt="Preview"
                    className="max-h-48 w-full object-contain"
                    onError={() => setError("Failed to load image from URL")}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-error-50 p-2 text-sm text-error-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          {activeTab === "url" && (
            <Button
              type="button"
              onClick={handleInsertFromUrl}
              disabled={!url.trim()}
            >
              Insert
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
