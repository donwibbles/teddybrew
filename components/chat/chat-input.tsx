"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  channelName?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder,
  channelName,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [content]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const defaultPlaceholder = channelName
    ? `Message #${channelName}`
    : "Type a message...";

  return (
    <div className="p-4 border-t border-neutral-200 bg-white">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          disabled={disabled}
          rows={1}
          maxLength={2000}
          className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm
                     placeholder:text-neutral-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !content.trim()}
          size="icon"
          className="shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
