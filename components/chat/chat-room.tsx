"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Hash, Loader2 } from "lucide-react";
import { ChatMessage, ChatMessageSkeleton } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useAblyChannel, type AblyMessage } from "@/hooks/use-ably";
import { sendChatMessage, deleteChatMessage, getChatMessages } from "@/lib/actions/chat";
import { toast } from "sonner";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  channelId: string;
  authorId: string;
  author: Author;
  createdAt: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  // Ably channel for real-time messages
  const ablyChannelName = channelId
    ? `community:${communityId}:chat:${channelId}`
    : null;

  const { isConnected } = useAblyChannel(
    ablyChannelName,
    "message",
    useCallback((ablyMessage: AblyMessage) => {
      const messageData = ablyMessage.data as Message;
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === messageData.id)) return prev;
        return [...prev, messageData];
      });
      shouldScrollRef.current = true;
    }, [])
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

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      setMessages([]);
      setNextCursor(undefined);
      setHasMore(false);

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
      })) as Message[]),
      ...prev,
    ]);
    setNextCursor(result.nextCursor);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  };

  // Send message
  const handleSend = async (content: string) => {
    setIsSending(true);
    const result = await sendChatMessage({ channelId, content });

    if (!result.success) {
      toast.error(result.error);
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
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Hash className="h-12 w-12 text-neutral-300 mb-4" />
            <h3 className="font-medium text-neutral-900 mb-1">
              Welcome to #{channelName}
            </h3>
            <p className="text-sm text-neutral-500">
              This is the beginning of the conversation.
            </p>
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
      />
    </div>
  );
}
