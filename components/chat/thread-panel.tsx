"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, Hash } from "lucide-react";
import { ChatMessage, ChatMessageSkeleton } from "./chat-message";
import { ChatInput } from "./chat-input";
import { PinnedBanner } from "./pinned-banner";
import { useAblyChannel, type AblyMessage } from "@/hooks/use-ably";
import {
  sendChatMessage,
  deleteChatMessage,
  getThreadMessages,
  pinMessage,
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
  createdAt: string | Date;
  deletedAt?: string | Date | null;
  replyToId?: string | null;
  replyTo?: ReplyTo | null;
  threadRootId?: string | null;
  depth?: number;
  replyCount?: number;
  isPinnedInThread?: boolean;
  reactionCounts: Record<string, number>;
}

interface PinnedMessage {
  id: string;
  content: string;
  author: Author;
  pinnedAt?: Date | string | null;
}

interface ThreadPanelProps {
  threadRootId: string;
  channelId: string;
  communityId: string;
  currentUserId: string;
  currentUser: { id: string; name: string | null; image: string | null };
  isOwner: boolean;
  onClose: () => void;
}

export function ThreadPanel({
  threadRootId,
  channelId,
  communityId,
  currentUserId,
  currentUser: _currentUser,
  isOwner,
  onClose,
}: ThreadPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [pinnedInThread, setPinnedInThread] = useState<PinnedMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollModeRef = useRef<"none" | "instant" | "smooth">("instant");

  // Ably channel for real-time messages
  const ablyChannelName = `community:${communityId}:chat:${channelId}`;

  useAblyChannel(
    ablyChannelName,
    "message",
    useCallback(
      (ablyMessage: AblyMessage) => {
        const messageData = ablyMessage.data as Message;
        // Only add if this message belongs to our thread
        if (
          messageData.threadRootId === threadRootId ||
          messageData.id === threadRootId
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === messageData.id)) return prev;
            return [
              ...prev,
              { ...messageData, reactionCounts: messageData.reactionCounts || {} },
            ];
          });
          scrollModeRef.current = "smooth";
        }
      },
      [threadRootId]
    )
  );

  // Listen for message deletions
  useAblyChannel(
    ablyChannelName,
    "message-deleted",
    useCallback((ablyMessage: AblyMessage) => {
      const { messageId } = ablyMessage.data as { messageId: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m
        )
      );
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
    useCallback(
      (ablyMessage: AblyMessage) => {
        const { messageId, pinType, isPinned } = ablyMessage.data as {
          messageId: string;
          pinType: "channel" | "thread";
          isPinned: boolean;
        };

        if (pinType === "thread") {
          if (isPinned) {
            setMessages((prev) => {
              const msg = prev.find((m) => m.id === messageId);
              if (msg) {
                setPinnedInThread((pinned) => {
                  if (pinned.some((p) => p.id === messageId)) return pinned;
                  return [
                    {
                      id: msg.id,
                      content: msg.content,
                      author: msg.author,
                      pinnedAt: new Date().toISOString(),
                    },
                    ...pinned,
                  ];
                });
              }
              return prev.map((m) =>
                m.id === messageId ? { ...m, isPinnedInThread: true } : m
              );
            });
          } else {
            setPinnedInThread((prev) => prev.filter((p) => p.id !== messageId));
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, isPinnedInThread: false } : m
              )
            );
          }
        }
      },
      []
    )
  );

  // Fetch thread messages
  useEffect(() => {
    async function loadThread() {
      setIsLoading(true);
      const result = await getThreadMessages({ threadRootId });
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
      setPinnedInThread(result.pinnedInThread as PinnedMessage[]);
      setIsLoading(false);
      scrollModeRef.current = "instant";
    }

    loadThread();
  }, [threadRootId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollModeRef.current !== "none" && messagesEndRef.current) {
      const behavior = scrollModeRef.current === "instant" ? "instant" : "smooth";
      messagesEndRef.current.scrollIntoView({ behavior });
      scrollModeRef.current = "none";
    }
  }, [messages]);

  // Send reply in thread
  const handleSend = async (content: string) => {
    setIsSending(true);
    // Reply to the last message in thread, or thread root if empty
    const lastMessage = messages[messages.length - 1];
    const replyToId = lastMessage?.depth === 0 ? lastMessage.id : threadRootId;

    const result = await sendChatMessage({
      channelId,
      content,
      replyToId,
      clientMessageId: crypto.randomUUID(),
    });

    if (!result.success) {
      toast.error(result.error);
    }
    setIsSending(false);
    scrollModeRef.current = "smooth";
  };

  // Delete message
  const handleDelete = async (messageId: string) => {
    setDeletingIds((prev) => new Set(prev).add(messageId));
    const result = await deleteChatMessage({ messageId });

    if (!result.success) {
      toast.error(result.error);
    }

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };

  // Scroll to message
  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`thread-message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-primary-subtle");
      setTimeout(() => {
        element.classList.remove("bg-primary-subtle");
      }, 2000);
    }
  };

  // Handle pin/unpin
  const handlePinMessage = async (messageId: string, isPinned: boolean) => {
    const result = await pinMessage({ messageId, pinType: "thread", isPinned });
    if (!result.success) {
      toast.error(result.error);
    }
  };

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, emoji: EmojiKey) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentCount = m.reactionCounts[emoji] || 0;
        const newCount = currentCount > 0 ? currentCount - 1 : currentCount + 1;
        return {
          ...m,
          reactionCounts: { ...m.reactionCounts, [emoji]: newCount },
        };
      })
    );

    const result = await toggleReaction({ messageId, emoji });
    if (!result.success) {
      toast.error(result.error);
    }
  };

  // Get thread root message
  const rootMessage = messages.find((m) => m.id === threadRootId);

  return (
    <div className="w-80 lg:w-96 border-l border-border flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-foreground-muted" />
          <h3 className="font-semibold text-foreground">Thread</h3>
          {rootMessage && (
            <span className="text-xs text-foreground-muted">
              {messages.length - 1} {messages.length - 1 === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-foreground-muted hover:text-foreground hover:bg-background-hover rounded transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Pinned in thread banner */}
      {pinnedInThread.length > 0 && (
        <PinnedBanner
          pinnedMessages={pinnedInThread}
          onJumpToMessage={handleScrollToMessage}
          onUnpin={isOwner ? (id) => handlePinMessage(id, false) : undefined}
          canModerate={isOwner}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ChatMessageSkeleton count={4} />
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} id={`thread-message-${message.id}`}>
                {message.deletedAt ? (
                  <div className="px-4 py-2 text-foreground-muted italic text-sm">
                    [Message deleted]
                  </div>
                ) : (
                  <ChatMessage
                    id={message.id}
                    content={message.content}
                    author={message.author}
                    createdAt={
                      message.createdAt instanceof Date
                        ? message.createdAt.toISOString()
                        : message.createdAt
                    }
                    isOwnMessage={message.authorId === currentUserId}
                    canDelete={message.authorId === currentUserId || isOwner}
                    onDelete={handleDelete}
                    isDeleting={deletingIds.has(message.id)}
                    replyToId={message.replyToId}
                    replyTo={message.replyTo}
                    onScrollToMessage={handleScrollToMessage}
                    reactionCounts={message.reactionCounts}
                    onToggleReaction={handleToggleReaction}
                    depth={message.depth}
                    canPin={isOwner}
                    isPinned={message.isPinnedInThread}
                    onPin={handlePinMessage}
                    // No reply button in thread panel - replies go to thread root
                    canReply={false}
                    // Hide reply preview in thread - original message shown at top
                    hideReplyPreview={true}
                  />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input for replying in thread */}
      <ChatInput
        onSend={handleSend}
        disabled={isSending}
        isSending={isSending}
        placeholder="Reply in thread..."
        autoFocus={true}
      />
    </div>
  );
}
