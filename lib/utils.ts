import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get initials from a name string.
 * Returns up to 2 characters (first letter of first and last word).
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "A"
 * getInitials("Mary Jane Watson") // "MW"
 * getInitials(null) // ""
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "";

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  // First letter of first word + first letter of last word
  return (
    words[0].charAt(0).toUpperCase() +
    words[words.length - 1].charAt(0).toUpperCase()
  );
}
