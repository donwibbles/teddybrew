import { z } from "zod";

/**
 * Validation schemas for chat channels and messages
 */

// Channel name: lowercase alphanumeric with hyphens
const channelNameRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const channelNameSchema = z
  .string()
  .min(2, "Channel name must be at least 2 characters")
  .max(50, "Channel name must be at most 50 characters")
  .regex(
    channelNameRegex,
    "Channel name must be lowercase letters, numbers, and hyphens only"
  )
  .transform((val) => val.toLowerCase().trim());

export const channelDescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional()
  .transform((val) => val?.trim() || undefined);

export const messageContentSchema = z
  .string()
  .min(1, "Message cannot be empty")
  .max(2000, "Message must be at most 2000 characters")
  .transform((val) => val.trim());

/**
 * Schema for creating a new channel
 */
export const createChannelSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  name: channelNameSchema,
  description: channelDescriptionSchema,
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

/**
 * Schema for updating a channel
 */
export const updateChannelSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  name: channelNameSchema.optional(),
  description: channelDescriptionSchema,
});

export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;

/**
 * Schema for deleting a channel
 */
export const deleteChannelSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});

export type DeleteChannelInput = z.infer<typeof deleteChannelSchema>;

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  content: messageContentSchema,
  replyToId: z.string().optional(), // For reply threading
  clientMessageId: z.string().optional(), // Client-generated UUID for optimistic reconciliation
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Schema for getting thread messages
 */
export const getThreadMessagesSchema = z.object({
  threadRootId: z.string().min(1, "Thread root ID is required"),
});

export type GetThreadMessagesInput = z.infer<typeof getThreadMessagesSchema>;

/**
 * Schema for pinning/unpinning a message
 */
export const pinMessageSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  pinType: z.enum(["channel", "thread"]),
  isPinned: z.boolean(),
});

export type PinMessageInput = z.infer<typeof pinMessageSchema>;

/**
 * Schema for getting pinned messages
 */
export const getPinnedMessagesSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});

export type GetPinnedMessagesInput = z.infer<typeof getPinnedMessagesSchema>;

/**
 * Schema for marking channel as read
 */
export const markChannelReadSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});

export type MarkChannelReadInput = z.infer<typeof markChannelReadSchema>;

/**
 * Schema for getting unread counts
 */
export const getUnreadCountsSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
});

export type GetUnreadCountsInput = z.infer<typeof getUnreadCountsSchema>;

/**
 * Schema for deleting a message
 */
export const deleteMessageSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

/**
 * Schema for getting messages with pagination
 */
export const getMessagesSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
