"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { getPresignedUploadUrl, confirmUploadComplete } from "@/lib/actions/upload";

interface AvatarUploadProps {
  userId: string;
  currentImage?: string | null;
  userName?: string | null;
}

export function AvatarUpload({ userId, currentImage, userName }: AvatarUploadProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayImage = preview || currentImage;

  const handleFile = useCallback(
    async (file: File) => {
      // Client-side validation
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a JPEG, PNG, GIF, or WebP image");
        return;
      }

      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        toast.error("Image must be smaller than 2MB");
        return;
      }

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setIsUploading(true);

      try {
        // Get presigned URL
        const result = await getPresignedUploadUrl({
          type: "avatar",
          entityId: userId,
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
          throw new Error("Failed to upload image");
        }

        // Confirm upload and update user record
        const confirmResult = await confirmUploadComplete({
          type: "avatar",
          entityId: userId,
          publicUrl: result.data.publicUrl,
        });

        if (!confirmResult.success) {
          throw new Error(confirmResult.error);
        }

        toast.success("Profile picture updated!");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to upload image");
        setPreview(null);
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(previewUrl);
      }
    },
    [userId, router]
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
    if (!isUploading) {
      inputRef.current?.click();
    }
  }, [isUploading]);

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="relative group"
      >
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border-4 border-white shadow-lg">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={userName || "Profile picture"}
              width={96}
              height={96}
              className="w-full h-full object-cover"
              unoptimized={displayImage.startsWith("blob:")}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-100">
              <User className="w-10 h-10 text-primary-600" />
            </div>
          )}
        </div>

        {/* Overlay */}
        <div
          className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity ${
            isUploading
              ? "bg-black/50 opacity-100"
              : "bg-black/40 opacity-0 group-hover:opacity-100"
          }`}
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </button>

      <p className="text-xs text-neutral-500">
        Click to upload a profile picture
      </p>
    </div>
  );
}
