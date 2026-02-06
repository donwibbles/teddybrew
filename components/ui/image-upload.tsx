"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getPresignedUploadUrl } from "@/lib/actions/upload";
import type { UploadType } from "@/lib/upload";
import { uploadConfigs } from "@/lib/upload";

interface ImageUploadProps {
  type: UploadType;
  entityId: string;
  currentImage?: string | null;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  aspectRatio?: number;
  maxSizeMB?: number;
  className?: string;
  previewClassName?: string;
  disabled?: boolean;
}

export function ImageUpload({
  type,
  entityId,
  currentImage,
  onUploadComplete,
  onRemove,
  aspectRatio,
  maxSizeMB,
  className,
  previewClassName,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = uploadConfigs[type];
  const maxSize = maxSizeMB ?? config.maxSizeMB;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (!config.allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).");
        return;
      }

      if (file.size > maxSize * 1024 * 1024) {
        setError(`File too large. Maximum size is ${maxSize}MB.`);
        return;
      }

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setIsUploading(true);

      try {
        // Get presigned URL
        const result = await getPresignedUploadUrl({
          type,
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

        // Notify parent of success
        onUploadComplete(result.data.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setPreview(null);
      } finally {
        setIsUploading(false);
        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);
      }
    },
    [type, entityId, maxSize, config.allowedTypes, onUploadComplete]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, isUploading, handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onRemove?.();
  }, [onRemove]);

  const displayImage = preview || currentImage;

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={config.allowedTypes.join(",")}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {displayImage ? (
        <div className="relative">
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border border-border bg-background-muted",
              previewClassName
            )}
            style={{
              aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
            }}
          >
            <Image
              src={displayImage}
              alt="Uploaded image"
              fill
              className="object-cover"
              unoptimized={displayImage.startsWith("blob:")}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <LoadingSpinner size="lg" className="border-white border-t-primary-400" />
              </div>
            )}
          </div>
          {!isUploading && !disabled && (
            <div className="absolute -right-2 -top-2 flex gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full shadow-md"
                onClick={handleClick}
                aria-label="Upload new image"
              >
                <Upload className="h-4 w-4" />
              </Button>
              {onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-md"
                  onClick={handleRemove}
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled || isUploading ? -1 : 0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background-muted px-6 py-8 transition-colors",
            dragActive && "border-primary-500 bg-primary-subtle",
            !disabled && !isUploading && "hover:border-primary-400 hover:bg-background-hover",
            disabled && "cursor-not-allowed opacity-50",
            previewClassName
          )}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          }}
        >
          {isUploading ? (
            <>
              <LoadingSpinner size="lg" />
              <p className="mt-3 text-sm text-foreground-muted">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-foreground-muted" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Click to upload or drag and drop
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                PNG, JPG, GIF, or WebP up to {maxSize}MB
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-error-50 p-2 text-sm text-error-600">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version of ImageUpload for inline use (e.g., in toolbar)
 */
interface CompactImageUploadProps {
  type: UploadType;
  entityId: string;
  onUploadComplete: (url: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CompactImageUpload({
  type,
  entityId,
  onUploadComplete,
  disabled = false,
  className,
  children,
}: CompactImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = uploadConfigs[type];

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (!config.allowedTypes.includes(file.type)) {
        setError("Invalid file type");
        return;
      }

      if (file.size > config.maxSizeMB * 1024 * 1024) {
        setError(`File too large (max ${config.maxSizeMB}MB)`);
        return;
      }

      setIsUploading(true);

      try {
        // Get presigned URL
        const result = await getPresignedUploadUrl({
          type,
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
          throw new Error("Failed to upload");
        }

        // Notify parent of success
        onUploadComplete(result.data.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [type, entityId, config, onUploadComplete]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      e.target.value = "";
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  }, [disabled, isUploading]);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={config.allowedTypes.join(",")}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <div onClick={handleClick} role="button" tabIndex={0} onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}>
        {isUploading ? (
          <LoadingSpinner size="sm" />
        ) : (
          children || (
            <Button type="button" variant="ghost" size="icon" disabled={disabled}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          )
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-error-600">{error}</p>
      )}
    </div>
  );
}
