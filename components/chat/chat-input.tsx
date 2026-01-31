"use client";

import { useState, useRef, useEffect, KeyboardEvent, forwardRef } from "react";
import { Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReplyingTo {
  id: string;
  authorName: string;
  content: string;
}

interface ChatInputProps {
  onSend: (content: string, replyToId?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  channelName?: string;
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
  autoFocus?: boolean;
  isSending?: boolean;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      disabled,
      placeholder,
      channelName,
      replyingTo,
      onCancelReply,
      autoFocus = false,
      isSending = false,
    },
    ref
  ) {
    const [content, setContent] = useState("");
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
      }
    }, [content, textareaRef]);

    // Focus input when replying
    useEffect(() => {
      if (replyingTo && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [replyingTo, textareaRef]);

    // Auto-focus on mount
    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        // Small delay to ensure the component is fully mounted
        const timer = setTimeout(() => {
          textareaRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [autoFocus, textareaRef]);

    const handleSubmit = () => {
      const trimmed = content.trim();
      if (trimmed && !disabled) {
        onSend(trimmed, replyingTo?.id);
        setContent("");
        onCancelReply?.();
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
      // Cancel reply on Escape
      if (e.key === "Escape" && replyingTo) {
        onCancelReply?.();
      }
    };

    const defaultPlaceholder = channelName
      ? `Message #${channelName}`
      : "Type a message...";

    return (
      <div className="p-4 border-t border-neutral-200 bg-white">
        {/* Replying indicator */}
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-3 py-2 bg-neutral-100 rounded-lg text-sm">
            <div className="min-w-0 flex-1">
              <span className="text-neutral-500">Replying to </span>
              <span className="font-medium text-neutral-700">
                {replyingTo.authorName}
              </span>
              <p className="text-neutral-500 text-xs truncate">
                {replyingTo.content.slice(0, 50)}
                {replyingTo.content.length > 50 && "..."}
              </p>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200 rounded transition-colors ml-2"
              title="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyingTo
                ? `Reply to ${replyingTo.authorName}...`
                : placeholder || defaultPlaceholder
            }
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
            disabled={disabled || !content.trim() || isSending}
            size="icon"
            className="shrink-0"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Press Enter to send, Shift+Enter for new line
          {replyingTo && ", Escape to cancel"}
        </p>
      </div>
    );
  }
);
