"use client";

import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts.
 * Supports both Ctrl and Cmd (Meta) modifiers for cross-platform compatibility.
 *
 * @example
 * // Open search with Cmd+K or Ctrl+K
 * useKeyboardShortcut({
 *   key: "k",
 *   metaKey: true,
 *   callback: () => setSearchOpen(true),
 * });
 */
export function useKeyboardShortcut({
  key,
  ctrlKey = false,
  metaKey = false,
  shiftKey = false,
  altKey = false,
  callback,
  enabled = true,
}: UseKeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check modifier keys
      const modifiersMatch =
        (ctrlKey ? event.ctrlKey : true) &&
        (metaKey ? event.metaKey : true) &&
        (shiftKey ? event.shiftKey : true) &&
        (altKey ? event.altKey : true);

      // For shortcuts with modifiers, also accept the opposite modifier
      // (e.g., Cmd+K on Mac, Ctrl+K on Windows)
      const crossPlatformMatch =
        (ctrlKey || metaKey) &&
        (event.ctrlKey || event.metaKey) &&
        (!shiftKey || event.shiftKey) &&
        (!altKey || event.altKey);

      const keyMatches = event.key.toLowerCase() === key.toLowerCase();

      if (keyMatches && (modifiersMatch || crossPlatformMatch)) {
        // Don't trigger if user is typing in an input/textarea
        const target = event.target as HTMLElement;
        const isEditable =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        // Allow shortcut even in editable fields if modifier is used
        if (!isEditable || (ctrlKey || metaKey)) {
          event.preventDefault();
          callback(event);
        }
      }
    },
    [key, ctrlKey, metaKey, shiftKey, altKey, callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for "/" keyboard shortcut to focus search.
 * Common pattern used by GitHub, YouTube, etc.
 */
export function useSearchShortcut(
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [callback, enabled]);
}
