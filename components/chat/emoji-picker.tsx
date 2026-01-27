"use client";

import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { CHAT_EMOJIS, type EmojiKey } from "@/lib/constants/emoji";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: EmojiKey) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      // Determine if there's enough room above
      const el = containerRef.current;
      const scrollParent = el.closest("[class*='overflow-y']") || el.parentElement;
      if (scrollParent) {
        const elRect = el.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        const spaceAbove = elRect.top - parentRect.top;
        setOpenAbove(spaceAbove > 60);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (key: EmojiKey) => {
    onSelect(key);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          "p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "bg-neutral-100 text-neutral-600"
        )}
        title="Add reaction"
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 p-1.5 bg-white rounded-lg shadow-lg border border-neutral-200 z-50",
            openAbove ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          <div className="flex gap-1">
            {CHAT_EMOJIS.map((emoji) => (
              <button
                key={emoji.key}
                onClick={() => handleSelect(emoji.key)}
                className="p-1.5 hover:bg-neutral-100 rounded transition-colors text-lg"
                title={emoji.label}
              >
                {emoji.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
