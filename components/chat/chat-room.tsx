"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Hash, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { ChatMessage, ChatMessageSkeleton } from "./chat-message";
import { ChatInput } from "./chat-input";
import { PinnedBanner } from "./pinned-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { useAblyChannel, type AblyMessage } from "@/hooks/use-ably";
import {
  sendChatMessage,
  deleteChatMessage,
  getChatMessages,
  getPinnedChannelMessages,
  pinMessage,
  markChannelRead,
} from "@/lib/actions/chat";
import { toggleReaction } from "@/lib/actions/reaction";
import { toast } from "sonner";
import type { EmojiKey } from "@/lib/constants/emoji";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  username?: string | null;
  isPublic?: boolean | null;
  role?: string | null;
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
  threadRootId?: string | null;
  depth?: number;
  replyCount?: number;
  isPinnedInChannel?: boolean;
  reactionCounts: Record<string, number>;
  // Pending message fields
  isPending?: boolean;
  pendingStatus?: "queued" | "sending" | "failed";
  clientMessageId?: string | null;
}

interface PinnedMessage {
  id: string;
  content: string;
  author: Author;
  pinnedAt: Date | string | null;
}

interface PendingMessage {
  clientMessageId: string;
  content: string;
  replyToId?: string;
  createdAt: string;
  status: "queued" | "sending" | "failed";
  retryCount: number;
}

interface ReplyingTo {
  id: string;
  authorName: string;
  content: string;
  depth?: number;
}

interface ChatRoomProps {
  channelId: string;
  channelName: string;
  channelDescription?: string | null;
  communityId: string;
  currentUserId: string;
  currentUser: { id: string; name: string | null; image: string | null };
  isOwner: boolean;
  onOpenThread?: (threadRootId: string) => void;
}

export function ChatRoom({
  channelId,
  channelName,
  channelDescription,
  communityId,
  currentUserId,
  currentUser,
  isOwner,
  onOpenThread,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

      // Check if this is our optimistic message coming back
      if (messageData.clientMessageId && pendingIdsRef.current.has(messageData.clientMessageId)) {
        // Remove from pending - it's now confirmed
        pendingIdsRef.current.delete(messageData.clientMessageId);
        setPendingMessages((prev) =>
          prev.filter((m) => m.clientMessageId !== messageData.clientMessageId)
        );
      }

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

  // Listen for pin updates
  useAblyChannel(
    ablyChannelName,
    "message-pinned",
    useCallback((ablyMessage: AblyMessage) => {
      const { messageId, pinType, isPinned } = ablyMessage.data as {
        messageId: string;
        pinType: "channel" | "thread";
        isPinned: boolean;
      };

      if (pinType === "channel") {
        if (isPinned) {
          // Find the message and add to pinned list
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === messageId);
            if (msg) {
              setPinnedMessages((pinned) => {
                if (pinned.some((p) => p.id === messageId)) return pinned;
                return [{ id: msg.id, content: msg.content, author: msg.author, pinnedAt: new Date().toISOString() }, ...pinned];
              });
            }
            return prev.map((m) =>
              m.id === messageId ? { ...m, isPinnedInChannel: true } : m
            );
          });
        } else {
          setPinnedMessages((prev) => prev.filter((p) => p.id !== messageId));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, isPinnedInChannel: false } : m
            )
          );
        }
      }
    }, [])
  );

  // Load initial messages and pinned messages
  useEffect(() => {
    async function loadMessages() {
      setIsLoading(true);
      setMessages([]);
      setNextCursor(undefined);
      setHasMore(false);
      setReplyingTo(null);
      setPendingMessages([]);
      pendingIdsRef.current.clear();

      const [messagesResult, pinnedResult] = await Promise.all([
        getChatMessages({ channelId, limit: 50 }),
        getPinnedChannelMessages({ channelId }),
      ]);

      setMessages(
        messagesResult.messages.map((m) => ({
          ...m,
          createdAt:
            m.createdAt instanceof Date
              ? m.createdAt.toISOString()
              : m.createdAt,
          reactionCounts: m.reactionCounts || {},
        })) as Message[]
      );
      setNextCursor(messagesResult.nextCursor);
      setHasMore(messagesResult.hasMore);
      setPinnedMessages(pinnedResult as PinnedMessage[]);
      setIsLoading(false);
      shouldScrollRef.current = true;

      // Mark channel as read
      markChannelRead({ channelId }).catch(() => {
        // Silently ignore errors
      });
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
  }, [messages, pendingMessages]);

  // Send a pending message
  const sendPendingMessage = useCallback(async (msg: PendingMessage) => {
    setPendingMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === msg.clientMessageId ? { ...m, status: "sending" as const } : m
      )
    );

    const result = await sendChatMessage({
      channelId,
      content: msg.content,
      replyToId: msg.replyToId,
      clientMessageId: msg.clientMessageId,
    });

    if (!result.success) {
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === msg.clientMessageId
            ? { ...m, status: "failed" as const, retryCount: m.retryCount + 1 }
            : m
        )
      );
      toast.error(result.error);
    }
    // On success, DON'T remove yet - wait for Ably echo with matching clientMessageId
  }, [channelId]);

  // Process queued messages on reconnect
  useEffect(() => {
    if (isConnected) {
      const queued = pendingMessages.filter((m) => m.status === "queued");
      queued.forEach((msg, i) => {
        // Stagger to avoid rate limits
        setTimeout(() => sendPendingMessage(msg), i * 100);
      });
    }
  }, [isConnected, pendingMessages, sendPendingMessage]);

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

  // Send message with optimistic UI
  const handleSend = async (content: string, replyToId?: string) => {
    const wasNearBottom = isNearBottom();
    const clientMessageId = crypto.randomUUID();

    const tempMessage: PendingMessage = {
      clientMessageId,
      content,
      replyToId,
      createdAt: new Date().toISOString(),
      status: "queued",
      retryCount: 0,
    };

    // Track for dedup
    pendingIdsRef.current.add(clientMessageId);
    setPendingMessages((prev) => [...prev, tempMessage]);

    if (wasNearBottom) {
      shouldScrollRef.current = true;
    }

    await sendPendingMessage(tempMessage);
  };

  // Retry failed message
  const handleRetry = (clientMessageId: string) => {
    const msg = pendingMessages.find((m) => m.clientMessageId === clientMessageId);
    if (msg) {
      sendPendingMessage(msg);
    }
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
        depth: message.depth,
      });
    }
  };

  // Scroll to a specific message
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-primary-50");
      setTimeout(() => {
        element.classList.remove("bg-primary-50");
      }, 2000);
    }
  };

  // Handle jump to pinned message
  const handleJumpToPinnedMessage = (messageId: string) => {
    const exists = messages.some((m) => m.id === messageId);
    if (exists) {
      handleScrollToMessage(messageId);
    } else {
      // TODO: Load messages around this message ID
      toast.info("Message not in current view");
    }
  };

  // Handle pin/unpin message
  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    const result = await pinMessage({ messageId, pinType: "channel", isPinned });
    if (!result.success) {
      toast.error(result.error);
    }
  };

  // Toggle reaction on a message (optimistic update)
  const handleToggleReaction = async (messageId: string, emoji: EmojiKey) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentCount = m.reactionCounts[emoji] || 0;
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
    }
  };

  // Merge confirmed messages with pending messages for display
  const displayMessages = useMemo(() => {
    const pendingAsMessages: Message[] = pendingMessages.map((p) => ({
      id: `pending-${p.clientMessageId}`,
      content: p.content,
      channelId,
      authorId: currentUserId,
      author: currentUser,
      createdAt: p.createdAt,
      replyToId: p.replyToId,
      reactionCounts: {},
      isPending: true,
      pendingStatus: p.status,
      clientMessageId: p.clientMessageId,
    }));

    return [...messages, ...pendingAsMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, pendingMessages, channelId, currentUserId, currentUser]);

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

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <PinnedBanner
          pinnedMessages={pinnedMessages}
          onJumpToMessage={handleJumpToPinnedMessage}
          onUnpin={isOwner ? (id) => handlePinMessage(id, false) : undefined}
          canModerate={isOwner}
        />
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {isLoading ? (
          <ChatMessageSkeleton count={8} />
        ) : displayMessages.length === 0 ? (
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
            {displayMessages.map((message) => (
              <div key={message.id}>
                <ChatMessage
                  id={message.id}
                  content={message.content}
                  author={message.author}
                  createdAt={message.createdAt}
                  isOwnMessage={message.authorId === currentUserId}
                  canDelete={!message.isPending && (message.authorId === currentUserId || isOwner)}
                  onDelete={handleDelete}
                  isDeleting={deletingIds.has(message.id)}
                  replyToId={message.replyToId}
                  replyTo={message.replyTo}
                  onReply={handleReply}
                  onScrollToMessage={handleScrollToMessage}
                  reactionCounts={message.reactionCounts}
                  onToggleReaction={handleToggleReaction}
                  depth={message.depth}
                  replyCount={message.replyCount}
                  onViewThread={onOpenThread}
                  canPin={isOwner && !message.isPending}
                  isPinned={message.isPinnedInChannel}
                  onPin={handlePinMessage}
                  isPending={message.isPending}
                  pendingStatus={message.pendingStatus}
                />
                {/* Retry UI for failed messages */}
                {message.isPending && message.pendingStatus === "failed" && (
                  <div className="flex items-center gap-2 text-error-600 text-xs px-4 pb-2 -mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Failed to send</span>
                    <button
                      onClick={() => handleRetry(message.clientMessageId!)}
                      className="underline hover:text-error-700 inline-flex items-center gap-1"
                    >
                      <RotateCw className="h-3 w-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input - no longer disabled based on connection */}
      <ChatInput
        ref={inputRef}
        onSend={handleSend}
        disabled={false}
        autoFocus={true}
        channelName={channelName}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}
