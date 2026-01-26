import "server-only";

import { prisma } from "@/lib/prisma";
import { DocumentStatus, Prisma } from "@prisma/client";

/**
 * Document database queries
 */

// Lock expiry time in milliseconds (5 minutes)
const LOCK_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Get documents for a community with filtering and pagination
 */
export async function getDocuments(
  communityId: string,
  options: {
    folderId?: string | null;
    status?: DocumentStatus;
    includeArchived?: boolean;
    limit?: number;
    cursor?: string;
  } = {}
) {
  const { folderId, status, includeArchived = false, limit = 20, cursor } = options;

  const where: Prisma.DocumentWhereInput = {
    communityId,
    deletedAt: null,
    ...(folderId !== undefined && { folderId }),
    ...(status && { status }),
    ...(!includeArchived && !status && { status: { not: DocumentStatus.ARCHIVED } }),
  };

  const documents = await prisma.document.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: [
      { isPinned: "desc" },
      { sortOrder: "asc" },
      { updatedAt: "desc" },
    ],
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      folder: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      lockedBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const hasMore = documents.length > limit;
  const items = hasMore ? documents.slice(0, -1) : documents;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  // Check if locks are expired
  const now = new Date();
  const itemsWithLockCheck = items.map((doc) => ({
    ...doc,
    isLocked: doc.lockedAt && doc.lockedById
      ? now.getTime() - doc.lockedAt.getTime() < LOCK_EXPIRY_MS
      : false,
  }));

  return {
    documents: itemsWithLockCheck,
    nextCursor,
    hasMore,
  };
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      folder: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      lockedBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      publishedBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!document || document.deletedAt) return null;

  // Check if lock is expired
  const now = new Date();
  const isLocked = document.lockedAt && document.lockedById
    ? now.getTime() - document.lockedAt.getTime() < LOCK_EXPIRY_MS
    : false;

  return {
    ...document,
    isLocked,
  };
}

/**
 * Get a document by community slug and document slug
 */
export async function getDocumentBySlug(communitySlug: string, documentSlug: string) {
  const community = await prisma.community.findUnique({
    where: { slug: communitySlug },
    select: { id: true },
  });

  if (!community) return null;

  const document = await prisma.document.findUnique({
    where: {
      communityId_slug: {
        communityId: community.id,
        slug: documentSlug,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      folder: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      lockedBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      publishedBy: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!document || document.deletedAt) return null;

  // Check if lock is expired
  const now = new Date();
  const isLocked = document.lockedAt && document.lockedById
    ? now.getTime() - document.lockedAt.getTime() < LOCK_EXPIRY_MS
    : false;

  return {
    ...document,
    isLocked,
  };
}

/**
 * Get document versions
 */
export async function getDocumentVersions(
  documentId: string,
  options: { limit?: number; cursor?: string } = {}
) {
  const { limit = 20, cursor } = options;

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { version: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const hasMore = versions.length > limit;
  const items = hasMore ? versions.slice(0, -1) : versions;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return {
    versions: items,
    nextCursor,
    hasMore,
  };
}

/**
 * Get a specific document version
 */
export async function getDocumentVersion(versionId: string) {
  return await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      document: {
        select: {
          id: true,
          title: true,
          communityId: true,
        },
      },
    },
  });
}

/**
 * Check if a document slug exists in a community
 */
export async function documentSlugExists(
  communityId: string,
  slug: string,
  excludeDocumentId?: string
): Promise<boolean> {
  const document = await prisma.document.findUnique({
    where: {
      communityId_slug: {
        communityId,
        slug,
      },
    },
    select: { id: true },
  });

  if (!document) return false;
  if (excludeDocumentId && document.id === excludeDocumentId) return false;
  return true;
}

/**
 * Generate a unique slug for a document
 */
export async function generateUniqueSlug(
  communityId: string,
  baseSlug: string,
  excludeDocumentId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await documentSlugExists(communityId, slug, excludeDocumentId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      // Fallback to timestamp-based slug
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

// ============ FOLDER QUERIES ============

/**
 * Get all folders for a community
 */
export async function getFolders(communityId: string) {
  const folders = await prisma.documentFolder.findMany({
    where: { communityId },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: {
          documents: {
            where: {
              deletedAt: null,
              status: { not: DocumentStatus.ARCHIVED },
            },
          },
        },
      },
    },
  });

  return folders.map((folder) => ({
    ...folder,
    documentCount: folder._count.documents,
  }));
}

/**
 * Get a folder by ID
 */
export async function getFolderById(folderId: string) {
  return await prisma.documentFolder.findUnique({
    where: { id: folderId },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get a folder by community and slug
 */
export async function getFolderBySlug(communityId: string, slug: string) {
  return await prisma.documentFolder.findUnique({
    where: {
      communityId_slug: {
        communityId,
        slug,
      },
    },
    include: {
      community: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Check if a folder slug exists in a community
 */
export async function folderSlugExists(
  communityId: string,
  slug: string,
  excludeFolderId?: string
): Promise<boolean> {
  const folder = await prisma.documentFolder.findUnique({
    where: {
      communityId_slug: {
        communityId,
        slug,
      },
    },
    select: { id: true },
  });

  if (!folder) return false;
  if (excludeFolderId && folder.id === excludeFolderId) return false;
  return true;
}

/**
 * Generate a unique slug for a folder
 */
export async function generateUniqueFolderSlug(
  communityId: string,
  baseSlug: string,
  excludeFolderId?: string
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await folderSlugExists(communityId, slug, excludeFolderId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

/**
 * Get document count for a community
 */
export async function getDocumentCount(
  communityId: string,
  options: { folderId?: string | null; status?: DocumentStatus } = {}
): Promise<number> {
  const { folderId, status } = options;

  return await prisma.document.count({
    where: {
      communityId,
      deletedAt: null,
      ...(folderId !== undefined && { folderId }),
      ...(status && { status }),
    },
  });
}

/**
 * Get total document count including all statuses (for sidebar)
 */
export async function getDocumentCounts(communityId: string) {
  const [total, drafts, published, archived] = await Promise.all([
    prisma.document.count({
      where: { communityId, deletedAt: null, status: { not: DocumentStatus.ARCHIVED } },
    }),
    prisma.document.count({
      where: { communityId, deletedAt: null, status: DocumentStatus.DRAFT },
    }),
    prisma.document.count({
      where: { communityId, deletedAt: null, status: DocumentStatus.PUBLISHED },
    }),
    prisma.document.count({
      where: { communityId, deletedAt: null, status: DocumentStatus.ARCHIVED },
    }),
  ]);

  return { total, drafts, published, archived };
}
