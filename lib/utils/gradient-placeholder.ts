import type { EventTypeValue } from "@/lib/validations/event";

/**
 * Generate a consistent hash number from a string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Predefined gradient pairs for generating consistent gradients
 */
const GRADIENT_PAIRS = [
  { from: "from-blue-400", to: "to-indigo-500" },
  { from: "from-purple-400", to: "to-pink-500" },
  { from: "from-green-400", to: "to-emerald-500" },
  { from: "from-orange-400", to: "to-red-500" },
  { from: "from-cyan-400", to: "to-blue-500" },
  { from: "from-pink-400", to: "to-rose-500" },
  { from: "from-teal-400", to: "to-cyan-500" },
  { from: "from-amber-400", to: "to-orange-500" },
  { from: "from-indigo-400", to: "to-purple-500" },
  { from: "from-rose-400", to: "to-pink-500" },
] as const;

/**
 * Generate consistent gradient classes from a string (e.g., community name)
 * Returns Tailwind gradient classes like "from-blue-400 to-indigo-500"
 */
export function getGradientFromString(str: string): string {
  const hash = hashString(str);
  const index = hash % GRADIENT_PAIRS.length;
  const pair = GRADIENT_PAIRS[index];
  return `${pair.from} ${pair.to}`;
}

/**
 * Predefined gradients for event types
 * Each type has a distinct gradient that reflects its nature
 */
export const EVENT_TYPE_GRADIENTS: Record<EventTypeValue, string> = {
  CANVASS: "from-green-400 to-emerald-500",
  PHONE_BANK: "from-blue-400 to-indigo-500",
  TEXT_BANK: "from-cyan-400 to-blue-500",
  MEETING: "from-slate-400 to-slate-600",
  RALLY: "from-red-400 to-orange-500",
  TOWN_HALL: "from-purple-400 to-indigo-500",
  FUNDRAISER: "from-amber-400 to-orange-500",
  TRAINING: "from-teal-400 to-cyan-500",
  SIGN_WAVING: "from-yellow-400 to-amber-500",
  VOTER_REGISTRATION: "from-indigo-400 to-purple-500",
  TABLING: "from-emerald-400 to-teal-500",
  WATCH_PARTY: "from-pink-400 to-rose-500",
  OTHER: "from-neutral-400 to-neutral-500",
};

/**
 * Get gradient classes for an event type
 * Falls back to a generic gradient if type is not recognized
 */
export function getEventTypeGradient(eventType: string | null | undefined): string {
  if (eventType && eventType in EVENT_TYPE_GRADIENTS) {
    return EVENT_TYPE_GRADIENTS[eventType as EventTypeValue];
  }
  return "from-neutral-400 to-neutral-500";
}
