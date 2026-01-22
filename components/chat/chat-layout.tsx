"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ChannelList } from "./channel-list";
import { ChatRoom } from "./chat-room";
import { OnlineMembers } from "./online-members";
import { CreateChannelDialog } from "./create-channel-dialog";
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

  // Update URL when channel changes
  useEffect(() => {
    if (activeChannelId && activeChannelId !== channelIdFromUrl) {
      router.replace(`/communities/${communitySlug}/chat?channel=${activeChannelId}`, {
        scroll: false,
      });
    }
  }, [activeChannelId, channelIdFromUrl, communitySlug, router]);

  // Get active channel details
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
    setShowMobileSidebar(false);
  };

  const handleChannelCreated = (channelId: string) => {
    setActiveChannelId(channelId);
    // Force refresh to get new channel list
    router.refresh();
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-lg border border-neutral-200 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="lg:hidden absolute top-4 left-4 z-20 p-2 bg-white border border-neutral-200 rounded-md shadow-sm"
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
          "w-56 border-r border-neutral-200 bg-neutral-50 shrink-0",
          "fixed lg:relative inset-y-0 left-0 z-10 lg:z-auto",
          "transform lg:transform-none transition-transform duration-200",
          showMobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <ChannelList
          channels={channels}
          activeChannelId={activeChannelId}
          onChannelSelect={handleChannelSelect}
          onCreateChannel={isOwner ? () => setShowCreateDialog(true) : undefined}
          isOwner={isOwner}
        />
      </div>

      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-5"
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
            isOwner={isOwner}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            Select a channel to start chatting
          </div>
        )}
      </div>

      {/* Online Members Sidebar - Hidden on mobile */}
      <div className="hidden xl:block w-52 border-l border-neutral-200 bg-neutral-50 shrink-0">
        <OnlineMembers currentUserId={currentUser.id} />
      </div>

      {/* Mobile Members Toggle - Show on tablet */}
      <button
        onClick={() => setShowMobileMembers(!showMobileMembers)}
        className="xl:hidden hidden md:block absolute top-4 right-4 z-20 p-2 bg-white border border-neutral-200 rounded-md shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Members Panel */}
      {showMobileMembers && (
        <>
          <div
            className="xl:hidden fixed inset-0 bg-black/20 z-10"
            onClick={() => setShowMobileMembers(false)}
          />
          <div className="xl:hidden fixed right-0 top-0 bottom-0 w-52 bg-neutral-50 border-l border-neutral-200 z-20">
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
