"use client";

import { Hash, Plus, Settings, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  event?: {
    id: string;
    title: string;
  } | null;
}

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel?: () => void;
  onEditChannel?: (channelId: string) => void;
  isOwner: boolean;
  unreadCounts?: Record<string, number>;
}

export function ChannelList({
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  onEditChannel,
  isOwner,
  unreadCounts = {},
}: ChannelListProps) {
  // Separate regular channels from event channels
  const regularChannels = channels.filter((c) => !c.event);
  const eventChannels = channels.filter((c) => c.event);

  const renderChannel = (channel: Channel, isEventChannel: boolean = false) => {
    const unreadCount = unreadCounts[channel.id] || 0;
    const hasUnread = unreadCount > 0;

    return (
      <button
        key={channel.id}
        onClick={() => onChannelSelect(channel.id)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors group",
          activeChannelId === channel.id
            ? "bg-primary-subtle text-primary-700"
            : hasUnread
            ? "text-foreground font-medium hover:bg-background-hover"
            : "text-foreground-muted hover:bg-background-hover hover:text-foreground"
        )}
      >
        {isEventChannel ? (
          <Calendar className="h-4 w-4 shrink-0 text-primary-400" />
        ) : (
          <Hash
            className={cn(
              "h-4 w-4 shrink-0",
              hasUnread ? "text-foreground-muted" : "text-foreground-muted"
            )}
          />
        )}
        <span className={cn("truncate flex-1 text-left", hasUnread && "font-medium")}>
          {channel.name}
        </span>

        {/* Unread count badge */}
        {hasUnread && activeChannelId !== channel.id && (
          <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {isOwner && onEditChannel && !channel.isDefault && !isEventChannel && !hasUnread && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditChannel(channel.id);
            }}
            className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-background-hover rounded"
          >
            <Settings className="h-3 w-3 text-foreground-muted" />
          </button>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Channels
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Regular channels */}
        {regularChannels.map((channel) => renderChannel(channel, false))}

        {/* Event channels section */}
        {eventChannels.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-2">
              <h4 className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                Event Channels
              </h4>
            </div>
            {eventChannels.map((channel) => renderChannel(channel, true))}
          </>
        )}
      </div>

      {isOwner && onCreateChannel && (
        <div className="p-3 border-t border-border">
          <button
            onClick={onCreateChannel}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-foreground-muted
                       hover:bg-background-hover hover:text-foreground rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        </div>
      )}
    </div>
  );
}
