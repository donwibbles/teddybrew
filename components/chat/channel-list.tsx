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
}

export function ChannelList({
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  onEditChannel,
  isOwner,
}: ChannelListProps) {
  // Separate regular channels from event channels
  const regularChannels = channels.filter((c) => !c.event);
  const eventChannels = channels.filter((c) => c.event);

  const renderChannel = (channel: Channel, isEventChannel: boolean = false) => (
    <button
      key={channel.id}
      onClick={() => onChannelSelect(channel.id)}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors group",
        activeChannelId === channel.id
          ? "bg-primary-50 text-primary-700"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      {isEventChannel ? (
        <Calendar className="h-4 w-4 shrink-0 text-primary-400" />
      ) : (
        <Hash className="h-4 w-4 shrink-0 text-neutral-400" />
      )}
      <span className="truncate">{channel.name}</span>
      {isOwner && onEditChannel && !channel.isDefault && !isEventChannel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditChannel(channel.id);
          }}
          className="ml-auto opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 rounded"
        >
          <Settings className="h-3 w-3 text-neutral-500" />
        </button>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
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
              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Event Channels
              </h4>
            </div>
            {eventChannels.map((channel) => renderChannel(channel, true))}
          </>
        )}
      </div>

      {isOwner && onCreateChannel && (
        <div className="p-3 border-t border-neutral-200">
          <button
            onClick={onCreateChannel}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-neutral-600
                       hover:bg-neutral-50 hover:text-neutral-900 rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Channel
          </button>
        </div>
      )}
    </div>
  );
}
