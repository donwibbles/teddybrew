import { z } from "zod";

/**
 * Validation schemas for community documents
 */

export const documentTitleSchema = z
  .string()
  .min(3, "Title must be at least 3 characters")
  .max(300, "Title must be at most 300 characters")
  .transform((val) => val.trim());

export const documentSlugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(300, "Slug must be at most 300 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only")
  .transform((val) => val.toLowerCase().trim());

export const documentContentSchema = z.object({}).passthrough(); // TipTap JSON

export const documentContentHtmlSchema = z
  .string()
  .max(1000000, "Content too large");

export const documentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const folderNameSchema = z
  .string()
  .min(1, "Folder name is required")
  .max(100, "Folder name must be at most 100 characters")
  .transform((val) => val.trim());

export const folderSlugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(100, "Slug must be at most 100 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only")
  .transform((val) => val.toLowerCase().trim());

export const folderDescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .transform((val) => val.trim())
  .optional()
  .nullable();

export const changeNoteSchema = z
  .string()
  .max(500, "Change note must be at most 500 characters")
  .transform((val) => val.trim())
  .optional();

/**
 * Schema for creating a new document
 */
export const createDocumentSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  title: documentTitleSchema,
  content: documentContentSchema,
  contentHtml: documentContentHtmlSchema,
  folderId: z.string().optional().nullable(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

/**
 * Schema for updating a document
 */
export const updateDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  title: documentTitleSchema.optional(),
  content: documentContentSchema.optional(),
  contentHtml: documentContentHtmlSchema.optional(),
  folderId: z.string().optional().nullable(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

/**
 * Schema for publishing a document
 */
export const publishDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  changeNote: changeNoteSchema,
});

export type PublishDocumentInput = z.infer<typeof publishDocumentSchema>;

/**
 * Schema for archiving a document
 */
export const archiveDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export type ArchiveDocumentInput = z.infer<typeof archiveDocumentSchema>;

/**
 * Schema for restoring an archived document
 */
export const restoreDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export type RestoreDocumentInput = z.infer<typeof restoreDocumentSchema>;

/**
 * Schema for deleting a document
 */
export const deleteDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export type DeleteDocumentInput = z.infer<typeof deleteDocumentSchema>;

/**
 * Schema for pinning a document
 */
export const pinDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  isPinned: z.boolean(),
});

export type PinDocumentInput = z.infer<typeof pinDocumentSchema>;

/**
 * Schema for locking/unlocking a document
 */
export const lockDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export type LockDocumentInput = z.infer<typeof lockDocumentSchema>;

export const unlockDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export type UnlockDocumentInput = z.infer<typeof unlockDocumentSchema>;

/**
 * Schema for restoring a document version
 */
export const restoreVersionSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  versionId: z.string().min(1, "Version ID is required"),
});

export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;

/**
 * Schema for reordering a document
 */
export const reorderDocumentSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
  sortOrder: z.number().int().min(0),
});

export type ReorderDocumentInput = z.infer<typeof reorderDocumentSchema>;

/**
 * Schema for creating a folder
 */
export const createFolderSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  name: folderNameSchema,
  description: folderDescriptionSchema,
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;

/**
 * Schema for updating a folder
 */
export const updateFolderSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
  name: folderNameSchema.optional(),
  description: folderDescriptionSchema,
});

export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

/**
 * Schema for deleting a folder
 */
export const deleteFolderSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
});

export type DeleteFolderInput = z.infer<typeof deleteFolderSchema>;

/**
 * Schema for reordering a folder
 */
export const reorderFolderSchema = z.object({
  folderId: z.string().min(1, "Folder ID is required"),
  sortOrder: z.number().int().min(0),
});

export type ReorderFolderInput = z.infer<typeof reorderFolderSchema>;

/**
 * Schema for getting documents with pagination
 */
export const getDocumentsSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  folderId: z.string().optional().nullable(),
  status: documentStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export type GetDocumentsInput = z.infer<typeof getDocumentsSchema>;

/**
 * Helper function to generate a slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}
