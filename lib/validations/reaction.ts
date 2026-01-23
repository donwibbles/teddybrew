import { z } from "zod";
import { CHAT_EMOJIS } from "@/lib/constants/emoji";

/**
 * Validation schemas for chat reactions
 */

const validEmojiKeys = CHAT_EMOJIS.map((e) => e.key) as [string, ...string[]];

export const toggleReactionSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
  emoji: z.enum(validEmojiKeys, {
    message: "Invalid emoji",
  }),
});

export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
