"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X, Users } from "lucide-react";
import { ChannelList } from "./channel-list";
import { ChatRoom } from "./chat-room";
import { ThreadPanel } from "./thread-panel";
import { OnlineMembers } from "./online-members";
import { CreateChannelDialog } from "./create-channel-dialog";
import { getUnreadCounts } from "@/lib/actions/chat";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface ChatLayoutProps {
  communityId: string;
  communitySlug: string;
  channels: Channel[];
  currentUser: User;
  isOwner: boolean;
  defaultChannelId?: string;
}

export function ChatLayout({
  communityId,
  communitySlug,
  channels,
  currentUser,
  isOwner,
  defaultChannelId,
}: ChatLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const channelIdFromUrl = searchParams.get("channel");
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    channelIdFromUrl || defaultChannelId || channels[0]?.id || null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Update URL when channel changes
  useEffect(() => {
    if (activeChannelId && activeChannelId !== channelIdFromUrl) {
      router.replace(`/communities/${communitySlug}/chat?channel=${activeChannelId}`, {
        scroll: false,
      });
    }
  }, [activeChannelId, channelIdFromUrl, communitySlug, router]);

  // Fetch unread counts on mount and periodically
  useEffect(() => {
    async function fetchUnreadCounts() {
      const counts = await getUnreadCounts({ communityId });
      setUnreadCounts(counts);
    }

    fetchUnreadCounts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [communityId]);

  // Filter out unread count for the active channel (user is viewing it)
  const effectiveUnreadCounts = useMemo(() => {
    if (!activeChannelId) return unreadCounts;
    const { [activeChannelId]: _, ...rest } = unreadCounts;
    return rest;
  }, [unreadCounts, activeChannelId]);

  // Get active channel details
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
    setShowMobileSidebar(false);
    setOpenThreadId(null); // Close thread when switching channels
  };

  const handleChannelCreated = (channelId: string) => {
    setActiveChannelId(channelId);
    // Force refresh to get new channel list
    router.refresh();
  };

  const handleOpenThread = (threadRootId: string) => {
    setOpenThreadId(threadRootId);
  };

  const handleCloseThread = () => {
    setOpenThreadId(null);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card rounded-lg border border-border overflow-hidden">
      {/* Channel Menu Button - Hidden on mobile (<768px), shown on tablet (768px-1023px), hidden on desktop (1024px+) */}
      <button
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="hidden md:block lg:hidden absolute top-4 left-4 z-50 p-2 bg-card border border-border rounded-md shadow-sm"
      >
        {showMobileSidebar ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Channel Sidebar */}
      <div
        className={cn(
          "w-56 border-r border-border bg-background-muted shrink-0",
          "fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto",
          "transform lg:transform-none transition-transform duration-200",
          // On mobile, always hidden (channels via main nav)
          // On tablet, toggle via button
          // On desktop, always visible
          "hidden md:block",
          showMobileSidebar ? "md:translate-x-0" : "md:-translate-x-full lg:translate-x-0"
        )}
      >
        <ChannelList
          channels={channels}
          activeChannelId={activeChannelId}
          onChannelSelect={handleChannelSelect}
          onCreateChannel={isOwner ? () => setShowCreateDialog(true) : undefined}
          isOwner={isOwner}
          unreadCounts={effectiveUnreadCounts}
        />
      </div>

      {/* Tablet Overlay for Channel Sidebar */}
      {showMobileSidebar && (
        <div
          className="hidden md:block lg:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <ChatRoom
            channelId={activeChannel.id}
            channelName={activeChannel.name}
            channelDescription={activeChannel.description}
            communityId={communityId}
            currentUserId={currentUser.id}
            currentUser={currentUser}
            isOwner={isOwner}
            onOpenThread={handleOpenThread}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground-muted">
            Select a channel to start chatting
          </div>
        )}
      </div>

      {/* Thread Panel */}
      {openThreadId && activeChannel && (
        <ThreadPanel
          threadRootId={openThreadId}
          channelId={activeChannel.id}
          communityId={communityId}
          currentUserId={currentUser.id}
          currentUser={currentUser}
          isOwner={isOwner}
          onClose={handleCloseThread}
        />
      )}

      {/* Online Members Sidebar - Hidden on mobile, hidden when thread panel is open */}
      {!openThreadId && (
        <div className="hidden xl:block w-52 border-l border-border bg-background-muted shrink-0">
          <OnlineMembers currentUserId={currentUser.id} />
        </div>
      )}

      {/* Members Toggle - Show on tablet (768px-1279px), hidden on mobile and xl+ */}
      {!openThreadId && (
        <button
          onClick={() => setShowMobileMembers(!showMobileMembers)}
          className="xl:hidden hidden md:block absolute top-4 right-4 z-50 p-2 bg-card border border-border rounded-md shadow-sm"
          title="Show members"
        >
          <Users className="h-5 w-5" />
        </button>
      )}

      {/* Tablet Members Panel */}
      {showMobileMembers && !openThreadId && (
        <>
          <div
            className="xl:hidden fixed inset-0 bg-black/20 z-30"
            onClick={() => setShowMobileMembers(false)}
          />
          <div className="xl:hidden fixed right-0 top-0 bottom-0 w-52 bg-background-muted border-l border-border z-40">
            <OnlineMembers currentUserId={currentUser.id} />
          </div>
        </>
      )}

      {/* Create Channel Dialog */}
      <CreateChannelDialog
        communityId={communityId}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleChannelCreated}
      />
    </div>
  );
}
