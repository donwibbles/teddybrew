import { z } from "zod";

/**
 * Send community invite schema
 */
export const sendInviteSchema = z.object({
  communityId: z.string().min(1, "Community ID is required"),
  email: z.string().email("Please enter a valid email address"),
});

export type SendInviteInput = z.infer<typeof sendInviteSchema>;

/**
 * Accept invite schema
 */
export const acceptInviteSchema = z.object({
  token: z.string().min(1, "Invite token is required"),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

/**
 * Cancel invite schema
 */
export const cancelInviteSchema = z.object({
  inviteId: z.string().min(1, "Invite ID is required"),
});

export type CancelInviteInput = z.infer<typeof cancelInviteSchema>;

/**
 * Resend invite schema
 */
export const resendInviteSchema = z.object({
  inviteId: z.string().min(1, "Invite ID is required"),
});

export type ResendInviteInput = z.infer<typeof resendInviteSchema>;
