"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getB2Client, getB2BucketName, getB2PublicUrl, isB2Configured } from "@/lib/b2";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canModerate, isMember } from "@/lib/db/members";
import {
  UploadType,
  generateUploadPath,
  validateUpload,
  generateUniqueFilename,
  getExtensionFromContentType,
} from "@/lib/upload";
import type { ActionResult } from "./community";
import { captureServerError } from "@/lib/sentry";
import { checkUploadRateLimit } from "@/lib/rate-limit";

// Presigned URL expiry time (5 minutes)
const PRESIGNED_URL_EXPIRY = 5 * 60;

interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Get a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(input: {
  type: UploadType;
  entityId: string;
  contentType: string;
  sizeBytes: number;
}): Promise<ActionResult<PresignedUploadResult>> {
  try {
    // Check if B2 is configured
    if (!isB2Configured()) {
      return { success: false, error: "File uploads are not configured" };
    }

    const { userId } = await verifySession();

    // Rate limiting
    const rateLimit = await checkUploadRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "You're uploading too quickly. Please wait before trying again." };
    }

    const { type, entityId, contentType, sizeBytes } = input;

    // Validate upload
    const validation = validateUpload(type, contentType, sizeBytes);
    if (!validation.valid) {
      return { success: false, error: validation.error || "Invalid upload" };
    }

    // Check permissions based on upload type
    const permissionCheck = await checkUploadPermission(userId, type, entityId);
    if (!permissionCheck.allowed) {
      return { success: false, error: permissionCheck.error || "Permission denied" };
    }

    // Generate unique filename and path
    const extension = getExtensionFromContentType(contentType);
    const filename = generateUniqueFilename(extension);
    const key = generateUploadPath(type, permissionCheck.entityPath || entityId, filename);

    // Generate presigned URL
    const client = getB2Client();
    const bucketName = getB2BucketName();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      ContentLength: sizeBytes,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    const publicUrl = `${getB2PublicUrl()}/${key}`;

    return {
      success: true,
      data: {
        uploadUrl,
        publicUrl,
        key,
      },
    };
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    captureServerError("upload.getPresignedUrl", error);
    // Surface actual error message to help diagnose B2 configuration issues
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to generate upload URL: ${errorMessage}` };
  }
}

/**
 * Check if user has permission to upload to a specific entity
 */
async function checkUploadPermission(
  userId: string,
  type: UploadType,
  entityId: string
): Promise<{ allowed: boolean; error?: string; entityPath?: string }> {
  switch (type) {
    case "avatar": {
      // Users can only upload to their own avatar
      if (entityId !== userId) {
        return { allowed: false, error: "You can only upload your own avatar" };
      }
      return { allowed: true, entityPath: userId };
    }

    case "community-card":
    case "community-banner": {
      // Owner/moderator can upload community images
      const community = await prisma.community.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!community) {
        return { allowed: false, error: "Community not found" };
      }
      if (!(await canModerate(userId, entityId))) {
        return { allowed: false, error: "Only moderators and owners can upload community images" };
      }
      return { allowed: true, entityPath: entityId };
    }

    case "event-cover": {
      // entityId can be an event ID (editing) or community ID (creating)
      const event = await prisma.event.findUnique({
        where: { id: entityId },
        select: { id: true, organizerId: true, communityId: true },
      });
      if (event) {
        // Editing an existing event — check organizer or mod
        const isOrganizer = event.organizerId === userId;
        const canMod = await canModerate(userId, event.communityId);
        if (!isOrganizer && !canMod) {
          return { allowed: false, error: "Only event organizers can upload event images" };
        }
        return { allowed: true, entityPath: entityId };
      }
      // Creating a new event — entityId is a communityId, check membership
      const community = await prisma.community.findUnique({
        where: { id: entityId },
        select: { id: true },
      });
      if (!community) {
        return { allowed: false, error: "Community or event not found" };
      }
      if (!(await isMember(userId, entityId))) {
        return { allowed: false, error: "Only community members can upload event images" };
      }
      return { allowed: true, entityPath: entityId };
    }

    case "forum-post": {
      // entityId format: "communityId/postId" or just "communityId" for new posts
      const parts = entityId.split("/");
      const communityId = parts[0];

      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: { id: true },
      });
      if (!community) {
        return { allowed: false, error: "Community not found" };
      }
      if (!(await isMember(userId, communityId))) {
        return { allowed: false, error: "Only members can upload images" };
      }
      return { allowed: true, entityPath: entityId };
    }

    case "document": {
      // entityId format: "communityId/documentId" or just "communityId" for new docs
      const parts = entityId.split("/");
      const communityId = parts[0];

      const community = await prisma.community.findUnique({
        where: { id: communityId },
        select: { id: true },
      });
      if (!community) {
        return { allowed: false, error: "Community not found" };
      }
      if (!(await canModerate(userId, communityId))) {
        return { allowed: false, error: "Only moderators and owners can upload document images" };
      }
      return { allowed: true, entityPath: entityId };
    }

    default:
      return { allowed: false, error: "Invalid upload type" };
  }
}

/**
 * Confirm upload completed (optional - for tracking)
 */
export async function confirmUploadComplete(input: {
  type: UploadType;
  entityId: string;
  publicUrl: string;
}): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();
    const { type, entityId, publicUrl } = input;

    // Check permission again
    const permissionCheck = await checkUploadPermission(userId, type, entityId);
    if (!permissionCheck.allowed) {
      return { success: false, error: permissionCheck.error || "Permission denied" };
    }

    // Update the entity with the new image URL based on type
    switch (type) {
      case "avatar":
        await prisma.user.update({
          where: { id: userId },
          data: { image: publicUrl },
        });
        break;

      case "community-card":
        await prisma.community.update({
          where: { id: entityId },
          data: { cardImage: publicUrl },
        });
        break;

      case "community-banner":
        await prisma.community.update({
          where: { id: entityId },
          data: { bannerImage: publicUrl },
        });
        break;

      case "event-cover":
        await prisma.event.update({
          where: { id: entityId },
          data: { coverImage: publicUrl },
        });
        break;

      // forum-post and document don't update a specific field
      // The URL is embedded in the content
      case "forum-post":
      case "document":
        // No database update needed - URL is used in content
        break;
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to confirm upload:", error);
    captureServerError("upload.confirm", error);
    return { success: false, error: "Failed to confirm upload" };
  }
}
