"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { sanitizeText } from "@/lib/utils/sanitize";
import {
  createDocumentSchema,
  updateDocumentSchema,
  publishDocumentSchema,
  archiveDocumentSchema,
  restoreDocumentSchema,
  deleteDocumentSchema,
  pinDocumentSchema,
  lockDocumentSchema,
  unlockDocumentSchema,
  restoreVersionSchema,
  createFolderSchema,
  updateFolderSchema,
  deleteFolderSchema,
  generateSlug,
} from "@/lib/validations/document";
import { publishToChannel, getDocumentChannelName } from "@/lib/ably";
import { checkDocumentRateLimit, checkFolderRateLimit } from "@/lib/rate-limit";
import { canModerate, logModerationAction } from "@/lib/db/members";
import {
  generateUniqueSlug,
  generateUniqueFolderSlug,
  getDocumentById,
  getFolderById,
  getDocumentVersions,
} from "@/lib/db/documents";
import type { ActionResult } from "./community";
import { DocumentStatus, Prisma } from "@prisma/client";

/**
 * Create a new document
 */
export async function createDocument(
  input: unknown
): Promise<ActionResult<{ documentId: string; slug: string }>> {
  try {
    const { userId } = await verifySession();

    const parsed = createDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, title, content, contentHtml, folderId } = parsed.data;

    // Rate limiting
    const rateLimit = await checkDocumentRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "Please wait before creating another document" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, communityId))) {
      return { success: false, error: "Only moderators and owners can create documents" };
    }

    // Get community for revalidation
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Validate folder if provided
    if (folderId) {
      const folder = await prisma.documentFolder.findUnique({
        where: { id: folderId },
        select: { communityId: true },
      });
      if (!folder || folder.communityId !== communityId) {
        return { success: false, error: "Folder not found" };
      }
    }

    // Generate unique slug
    const baseSlug = generateSlug(title);
    const slug = await generateUniqueSlug(communityId, baseSlug);

    // Create document
    const document = await prisma.document.create({
      data: {
        title: sanitizeText(title),
        slug,
        content: content as Prisma.InputJsonValue,
        contentHtml,
        communityId,
        folderId: folderId || null,
        authorId: userId,
        status: DocumentStatus.DRAFT,
      },
    });

    revalidatePath(`/communities/${community.slug}/docs`);

    return { success: true, data: { documentId: document.id, slug: document.slug } };
  } catch (error) {
    console.error("Failed to create document:", error);
    return { success: false, error: "Failed to create document" };
  }
}

/**
 * Update a document
 */
export async function updateDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId, title, content, contentHtml, folderId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can edit documents" };
    }

    // Check lock (allow if user holds the lock or lock is expired)
    if (document.isLocked && document.lockedById !== userId) {
      return { success: false, error: `Document is being edited by ${document.lockedBy?.name || "another user"}` };
    }

    // Validate folder if provided
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.documentFolder.findUnique({
        where: { id: folderId },
        select: { communityId: true },
      });
      if (!folder || folder.communityId !== document.communityId) {
        return { success: false, error: "Folder not found" };
      }
    }

    // Build update data
    const updateData: {
      title?: string;
      slug?: string;
      content?: object;
      contentHtml?: string;
      folderId?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (title) {
      updateData.title = sanitizeText(title);
      // Update slug if title changes
      const baseSlug = generateSlug(title);
      updateData.slug = await generateUniqueSlug(document.communityId, baseSlug, documentId);
    }
    if (content) {
      updateData.content = content;
    }
    if (contentHtml !== undefined) {
      updateData.contentHtml = contentHtml;
    }
    if (folderId !== undefined) {
      updateData.folderId = folderId;
    }

    await prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });

    revalidatePath(`/communities/${document.community.slug}/docs`);
    revalidatePath(`/communities/${document.community.slug}/docs/${document.slug}`);
    if (updateData.slug && updateData.slug !== document.slug) {
      revalidatePath(`/communities/${document.community.slug}/docs/${updateData.slug}`);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update document:", error);
    return { success: false, error: "Failed to update document" };
  }
}

/**
 * Publish a document
 */
export async function publishDocument(
  input: unknown
): Promise<ActionResult<{ version: number }>> {
  try {
    const { userId } = await verifySession();

    const parsed = publishDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId, changeNote } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can publish documents" };
    }

    // Create version snapshot and update document in transaction
    const newVersion = document.version + 1;

    await prisma.$transaction(async (tx) => {
      // Create version snapshot
      await tx.documentVersion.create({
        data: {
          documentId,
          version: newVersion,
          title: document.title,
          content: document.content as Prisma.InputJsonValue,
          contentHtml: document.contentHtml,
          authorId: userId,
          changeNote,
        },
      });

      // Update document
      await tx.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedById: userId,
          version: newVersion,
          // Release lock on publish
          lockedAt: null,
          lockedById: null,
        },
      });
    });

    // Notify via Ably
    try {
      await publishToChannel(
        getDocumentChannelName(document.communityId, documentId),
        "published",
        { documentId, title: document.title, version: newVersion }
      );
    } catch (err) {
      console.error("Failed to publish document notification:", err);
    }

    revalidatePath(`/communities/${document.community.slug}/docs`);
    revalidatePath(`/communities/${document.community.slug}/docs/${document.slug}`);

    return { success: true, data: { version: newVersion } };
  } catch (error) {
    console.error("Failed to publish document:", error);
    return { success: false, error: "Failed to publish document" };
  }
}

/**
 * Archive a document
 */
export async function archiveDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = archiveDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can archive documents" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.ARCHIVED,
        lockedAt: null,
        lockedById: null,
      },
    });

    // Log moderation action
    logModerationAction({
      communityId: document.communityId,
      moderatorId: userId,
      action: "ARCHIVE_DOCUMENT",
      targetType: "Document",
      targetId: documentId,
      targetTitle: document.title,
    }).catch((err) => console.error("Failed to log moderation action:", err));

    revalidatePath(`/communities/${document.community.slug}/docs`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to archive document:", error);
    return { success: false, error: "Failed to archive document" };
  }
}

/**
 * Restore an archived document
 */
export async function restoreDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = restoreDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can restore documents" };
    }

    // Restore to DRAFT status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.DRAFT,
      },
    });

    revalidatePath(`/communities/${document.community.slug}/docs`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to restore document:", error);
    return { success: false, error: "Failed to restore document" };
  }
}

/**
 * Delete a document (soft delete)
 */
export async function deleteDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = deleteDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can delete documents" };
    }

    // Soft delete
    await prisma.document.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
        lockedAt: null,
        lockedById: null,
      },
    });

    // Log moderation action
    logModerationAction({
      communityId: document.communityId,
      moderatorId: userId,
      action: "DELETE_DOCUMENT",
      targetType: "Document",
      targetId: documentId,
      targetTitle: document.title,
    }).catch((err) => console.error("Failed to log moderation action:", err));

    revalidatePath(`/communities/${document.community.slug}/docs`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

/**
 * Pin/unpin a document
 */
export async function pinDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = pinDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId, isPinned } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can pin documents" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { isPinned },
    });

    // Log moderation action
    logModerationAction({
      communityId: document.communityId,
      moderatorId: userId,
      action: isPinned ? "PIN_DOCUMENT" : "UNPIN_DOCUMENT",
      targetType: "Document",
      targetId: documentId,
      targetTitle: document.title,
    }).catch((err) => console.error("Failed to log moderation action:", err));

    revalidatePath(`/communities/${document.community.slug}/docs`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to pin document:", error);
    return { success: false, error: "Failed to pin document" };
  }
}

/**
 * Lock a document for editing
 */
export async function lockDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = lockDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can edit documents" };
    }

    // Check existing lock
    if (document.isLocked && document.lockedById !== userId) {
      return {
        success: false,
        error: `Document is being edited by ${document.lockedBy?.name || "another user"}`,
      };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        lockedAt: new Date(),
        lockedById: userId,
      },
    });

    // Notify via Ably
    try {
      await publishToChannel(
        getDocumentChannelName(document.communityId, documentId),
        "locked",
        { documentId, lockedById: userId }
      );
    } catch (err) {
      console.error("Failed to publish lock notification:", err);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to lock document:", error);
    return { success: false, error: "Failed to lock document" };
  }
}

/**
 * Unlock a document
 */
export async function unlockDocument(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = unlockDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check permission - can unlock if owner/mod or if you hold the lock
    const canMod = await canModerate(userId, document.communityId);
    if (!canMod && document.lockedById !== userId) {
      return { success: false, error: "You cannot unlock this document" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        lockedAt: null,
        lockedById: null,
      },
    });

    // Notify via Ably
    try {
      await publishToChannel(
        getDocumentChannelName(document.communityId, documentId),
        "unlocked",
        { documentId }
      );
    } catch (err) {
      console.error("Failed to publish unlock notification:", err);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to unlock document:", error);
    return { success: false, error: "Failed to unlock document" };
  }
}

/**
 * Refresh document lock (heartbeat)
 */
export async function refreshDocumentLock(documentId: string): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { lockedById: true },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Only the lock holder can refresh
    if (document.lockedById !== userId) {
      return { success: false, error: "You do not hold the lock on this document" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { lockedAt: new Date() },
    });

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to refresh document lock:", error);
    return { success: false, error: "Failed to refresh lock" };
  }
}

/**
 * Restore a previous version
 */
export async function restoreVersion(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = restoreVersionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { documentId, versionId } = parsed.data;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can restore versions" };
    }

    // Check lock
    if (document.isLocked && document.lockedById !== userId) {
      return { success: false, error: `Document is being edited by ${document.lockedBy?.name || "another user"}` };
    }

    // Get the version to restore
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.documentId !== documentId) {
      return { success: false, error: "Version not found" };
    }

    // Update document with version content
    await prisma.document.update({
      where: { id: documentId },
      data: {
        title: version.title,
        content: version.content as Prisma.InputJsonValue,
        contentHtml: version.contentHtml,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/communities/${document.community.slug}/docs/${document.slug}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to restore version:", error);
    return { success: false, error: "Failed to restore version" };
  }
}

interface VersionData {
  id: string;
  version: number;
  title: string;
  changeNote: string | null;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

/**
 * Get document versions (server action wrapper for client components)
 */
export async function getVersions(input: {
  documentId: string;
  limit?: number;
}): Promise<ActionResult<{ versions: VersionData[]; hasMore: boolean }>> {
  try {
    const { userId } = await verifySession();
    const { documentId, limit = 50 } = input;

    // Get document
    const document = await getDocumentById(documentId);
    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, document.communityId))) {
      return { success: false, error: "Only moderators and owners can view version history" };
    }

    const result = await getDocumentVersions(documentId, { limit });

    return {
      success: true,
      data: {
        versions: result.versions as VersionData[],
        hasMore: result.hasMore,
      },
    };
  } catch (error) {
    console.error("Failed to get document versions:", error);
    return { success: false, error: "Failed to load version history" };
  }
}

// ============ FOLDER ACTIONS ============

/**
 * Create a new folder
 */
export async function createFolder(
  input: unknown
): Promise<ActionResult<{ folderId: string; slug: string }>> {
  try {
    const { userId } = await verifySession();

    const parsed = createFolderSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { communityId, name, description } = parsed.data;

    // Rate limiting
    const rateLimit = await checkFolderRateLimit(userId);
    if (!rateLimit.success) {
      return { success: false, error: "Please wait before creating another folder" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, communityId))) {
      return { success: false, error: "Only moderators and owners can create folders" };
    }

    // Get community
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    if (!community) {
      return { success: false, error: "Community not found" };
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    const slug = await generateUniqueFolderSlug(communityId, baseSlug);

    // Get max sort order
    const maxSort = await prisma.documentFolder.findFirst({
      where: { communityId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    // Create folder
    const folder = await prisma.documentFolder.create({
      data: {
        name: sanitizeText(name),
        slug,
        description: description ? sanitizeText(description) : null,
        communityId,
        sortOrder: (maxSort?.sortOrder ?? 0) + 1,
      },
    });

    revalidatePath(`/communities/${community.slug}/docs`);

    return { success: true, data: { folderId: folder.id, slug: folder.slug } };
  } catch (error) {
    console.error("Failed to create folder:", error);
    return { success: false, error: "Failed to create folder" };
  }
}

/**
 * Update a folder
 */
export async function updateFolder(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = updateFolderSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { folderId, name, description } = parsed.data;

    // Get folder
    const folder = await getFolderById(folderId);
    if (!folder) {
      return { success: false, error: "Folder not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, folder.communityId))) {
      return { success: false, error: "Only moderators and owners can edit folders" };
    }

    // Build update data
    const updateData: { name?: string; slug?: string; description?: string | null } = {};

    if (name) {
      updateData.name = sanitizeText(name);
      const baseSlug = generateSlug(name);
      updateData.slug = await generateUniqueFolderSlug(folder.communityId, baseSlug, folderId);
    }
    if (description !== undefined) {
      updateData.description = description ? sanitizeText(description) : null;
    }

    await prisma.documentFolder.update({
      where: { id: folderId },
      data: updateData,
    });

    revalidatePath(`/communities/${folder.community.slug}/docs`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to update folder:", error);
    return { success: false, error: "Failed to update folder" };
  }
}

/**
 * Delete a folder
 */
export async function deleteFolder(input: unknown): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    const parsed = deleteFolderSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { folderId } = parsed.data;

    // Get folder
    const folder = await getFolderById(folderId);
    if (!folder) {
      return { success: false, error: "Folder not found" };
    }

    // Check moderation permission
    if (!(await canModerate(userId, folder.communityId))) {
      return { success: false, error: "Only moderators and owners can delete folders" };
    }

    // Move documents to no folder, then delete folder
    await prisma.$transaction([
      prisma.document.updateMany({
        where: { folderId },
        data: { folderId: null },
      }),
      prisma.documentFolder.delete({
        where: { id: folderId },
      }),
    ]);

    revalidatePath(`/communities/${folder.community.slug}/docs`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to delete folder:", error);
    return { success: false, error: "Failed to delete folder" };
  }
}

/**
 * Reorder folders
 */
export async function reorderFolders(
  communityId: string,
  folderIds: string[]
): Promise<ActionResult> {
  try {
    const { userId } = await verifySession();

    // Check moderation permission
    if (!(await canModerate(userId, communityId))) {
      return { success: false, error: "Only moderators and owners can reorder folders" };
    }

    // Update sort orders in transaction
    await prisma.$transaction(
      folderIds.map((folderId, index) =>
        prisma.documentFolder.update({
          where: { id: folderId },
          data: { sortOrder: index },
        })
      )
    );

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { slug: true },
    });

    if (community) {
      revalidatePath(`/communities/${community.slug}/docs`);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Failed to reorder folders:", error);
    return { success: false, error: "Failed to reorder folders" };
  }
}
