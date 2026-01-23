/**
 * Chat reaction emojis - limited set for clean UX
 */
export const CHAT_EMOJIS = [
  { key: "thumbsup", emoji: "👍", label: "Like" },
  { key: "heart", emoji: "❤️", label: "Love" },
  { key: "laugh", emoji: "😂", label: "Haha" },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
  { key: "eyes", emoji: "👀", label: "Interesting" },
  { key: "fire", emoji: "🔥", label: "Fire" },
] as const;

export type EmojiKey = (typeof CHAT_EMOJIS)[number]["key"];

/**
 * Validate that an emoji key is valid
 */
export function isValidEmoji(key: string): key is EmojiKey {
  return CHAT_EMOJIS.some((e) => e.key === key);
}

/**
 * Get emoji display from key
 */
export function getEmojiDisplay(key: string): string {
  const found = CHAT_EMOJIS.find((e) => e.key === key);
  return found?.emoji ?? "❓";
}
