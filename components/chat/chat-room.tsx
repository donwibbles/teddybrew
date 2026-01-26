"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Hash, Loader2 } from "lucide-react";
import { ChatMessage, ChatMessageSkeleton } from "./chat-message";
import { ChatInput } from "./chat-input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAblyChannel, type AblyMessage } from "@/hooks/use-ably";
import { sendChatMessage, deleteChatMessage, getChatMessages } from "@/lib/actions/chat";
import { toggleReaction } from "@/lib/actions/reaction";
import { toast } from "sonner";
import type { EmojiKey } from "@/lib/constants/emoji";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface ReplyTo {
  id: string;
  content: string;
  author: { id: string; name: string | null };
}

interface Message {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
  author: Author;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
  reactionCounts: Record<string, number>;
}

interface ReplyingTo {
  id: string;
  authorName: string;
  content: string;
}

interface ChatRoomProps {
  channelId: string;
  channelName: string;
  channelDescription?: string | null;
  communityId: string;
  currentUserId: string;
  isOwner: boolean;
}

export function ChatRoom({
  channelId,
  channelName,
  channelDescription,
  communityId,
  currentUserId,
  isOwner,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Check if user is near the bottom of the chat (within 100px)
  const isNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  }, []);

  // Ably channel for real-time messages
  const ablyChannelName = channelId
    ? `community:${communityId}:chat:${channelId}`
    : null;

  const { isConnected } = useAblyChannel(
    ablyChannelName,
    "message",
    useCallback((ablyMessage: AblyMessage) => {
      const messageData = ablyMessage.data as Message;
      // Only scroll if user is near bottom when new message arrives
      const wasNearBottom = isNearBottom();
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === messageData.id)) return prev;
        return [...prev, { ...messageData, reactionCounts: messageData.reactionCounts || {} }];
      });
      if (wasNearBottom) {
        shouldScrollRef.current = true;
      }
    }, [isNearBottom])
  );

  // Listen for message deletions
  useAblyChannel(
    ablyChannelName,
    "message-deleted",
    useCallback((ablyMessage: AblyMessage) => {
      const { messageId } = ablyMessage.data as { messageId: string };
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }, [])
  );

  // Listen for reaction updates
  useAblyChannel(
    ablyChannelName,
    "reaction-update",
    useCallback((ablyMessage: AblyMessage) => {
      const { messageId, counts } = ablyMessage.data as {
        messageId: string;
        counts: Record<string, number>;
      };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactionCounts: counts } : m
        )
      );
    }, [])
  );

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      setMessages([]);
      setNextCursor(undefined);
      setHasMore(false);
      setReplyingTo(null);

      const result = await getChatMessages({
        channelId,
        limit: 50,
      });

      setMessages(
        result.messages.map((m) => ({
          ...m,
          createdAt:
            m.createdAt instanceof Date
              ? m.createdAt.toISOString()
              : m.createdAt,
          reactionCounts: m.reactionCounts || {},
        })) as Message[]
      );
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
      setIsLoading(false);
      shouldScrollRef.current = true;
    }

    if (channelId) {
      loadMessages();
    }
  }, [channelId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  // Load more messages
  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;

    setIsLoadingMore(true);
    const result = await getChatMessages({
      channelId,
      cursor: nextCursor,
      limit: 50,
    });

    setMessages((prev) => [
      ...(result.messages.map((m) => ({
        ...m,
        createdAt:
          m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
        reactionCounts: m.reactionCounts || {},
      })) as Message[]),
      ...prev,
    ]);
    setNextCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  };

  // Send message (with optional reply)
  const handleSend = async (content: string, replyToId?: string) => {
    // Check if near bottom BEFORE sending - only auto-scroll if user was already at bottom
    const wasNearBottom = isNearBottom();

    setIsSending(true);
    const result = await sendChatMessage({ channelId, content, replyToId });

    if (!result.success) {
      toast.error(result.error);
    } else if (wasNearBottom) {
      // Only scroll to bottom if user was already near bottom when sending
      shouldScrollRef.current = true;
    }
    setIsSending(false);
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    setDeletingIds((prev) => new Set(prev).add(messageId));

    const result = await deleteChatMessage({ messageId });

    if (!result.success) {
      toast.error(result.error);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };

  // Start replying to a message
  const handleReply = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setReplyingTo({
        id: message.id,
        authorName: message.author.name || "Anonymous",
        content: message.content,
      });
    }
  };

  // Scroll to a specific message
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight effect
      element.classList.add("bg-primary-50");
      setTimeout(() => {
        element.classList.remove("bg-primary-50");
      }, 2000);
    }
  };

  // Toggle reaction on a message (optimistic update)
  const handleToggleReaction = async (messageId: string, emoji: EmojiKey) => {
    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentCount = m.reactionCounts[emoji] || 0;
        // Toggle: if exists, remove; otherwise add 1
        // This is a simple heuristic - server is source of truth
        const newCount = currentCount > 0 ? currentCount - 1 : currentCount + 1;
        return {
          ...m,
          reactionCounts: {
            ...m.reactionCounts,
            [emoji]: newCount,
          },
        };
      })
    );

    const result = await toggleReaction({ messageId, emoji });
    if (!result.success) {
      toast.error(result.error);
      // Revert on error - but Ably will sync correct state anyway
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Channel Header */}
      <div className="px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-neutral-400" />
          <h2 className="font-semibold text-neutral-900">{channelName}</h2>
          {!isConnected && (
            <span className="ml-2 text-xs text-warning-600 bg-warning-50 px-2 py-0.5 rounded">
              Connecting...
            </span>
          )}
        </div>
        {channelDescription && (
          <p className="text-sm text-neutral-500 mt-1">{channelDescription}</p>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <ChatMessageSkeleton count={8} />
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={Hash}
              title={`Welcome to #${channelName}`}
              description="This is the beginning of the conversation."
            />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="py-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "Load older messages"
                  )}
                </button>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
                author={message.author}
                createdAt={message.createdAt}
                isOwnMessage={message.authorId === currentUserId}
                canDelete={
                  message.authorId === currentUserId || isOwner
                }
                onDelete={handleDelete}
                isDeleting={deletingIds.has(message.id)}
                replyToId={message.replyToId}
                replyTo={message.replyTo}
                onReply={handleReply}
                onScrollToMessage={handleScrollToMessage}
                reactionCounts={message.reactionCounts}
                onToggleReaction={handleToggleReaction}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isSending || !isConnected}
        channelName={channelName}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
