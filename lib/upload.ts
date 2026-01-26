/**
 * Upload types, validation, and path helpers
 */

export type UploadType =
  | "avatar"
  | "community-card"
  | "community-banner"
  | "event-cover"
  | "forum-post"
  | "document";

export interface UploadConfig {
  type: UploadType;
  maxSizeMB: number;
  pathPrefix: string;
  allowedTypes: string[];
}

/**
 * Configuration for each upload type
 */
export const uploadConfigs: Record<UploadType, UploadConfig> = {
  avatar: {
    type: "avatar",
    maxSizeMB: 2,
    pathPrefix: "avatars",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  "community-card": {
    type: "community-card",
    maxSizeMB: 2,
    pathPrefix: "communities",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  "community-banner": {
    type: "community-banner",
    maxSizeMB: 5,
    pathPrefix: "communities",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  "event-cover": {
    type: "event-cover",
    maxSizeMB: 5,
    pathPrefix: "events",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  "forum-post": {
    type: "forum-post",
    maxSizeMB: 5,
    pathPrefix: "forums",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  document: {
    type: "document",
    maxSizeMB: 5,
    pathPrefix: "documents",
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
};

/**
 * Get file extension from content type
 */
export function getExtensionFromContentType(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return extensions[contentType] || "jpg";
}

/**
 * Generate the storage path for an upload
 */
export function generateUploadPath(
  type: UploadType,
  entityId: string,
  filename: string
): string {
  const config = uploadConfigs[type];

  switch (type) {
    case "avatar":
      // avatars/{userId}/{filename}
      return `${config.pathPrefix}/${entityId}/${filename}`;

    case "community-card":
      // communities/{communityId}/card/{filename}
      return `${config.pathPrefix}/${entityId}/card/${filename}`;

    case "community-banner":
      // communities/{communityId}/banner/{filename}
      return `${config.pathPrefix}/${entityId}/banner/${filename}`;

    case "event-cover":
      // events/{eventId}/cover/{filename}
      return `${config.pathPrefix}/${entityId}/cover/${filename}`;

    case "forum-post":
      // forums/{communityId}/{postId}/{filename}
      // For forum posts, entityId should be "communityId/postId"
      return `${config.pathPrefix}/${entityId}/${filename}`;

    case "document":
      // documents/{communityId}/{documentId}/{filename}
      // For documents, entityId should be "communityId/documentId"
      return `${config.pathPrefix}/${entityId}/${filename}`;

    default:
      return `uploads/${entityId}/${filename}`;
  }
}

/**
 * Validate file type and size
 */
export function validateUpload(
  type: UploadType,
  contentType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  const config = uploadConfigs[type];

  // Check content type
  if (!config.allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${config.allowedTypes.join(", ")}`,
    };
  }

  // Check size
  const maxSizeBytes = config.maxSizeMB * 1024 * 1024;
  if (sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${config.maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique filename
 */
export function generateUniqueFilename(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${extension}`;
}
