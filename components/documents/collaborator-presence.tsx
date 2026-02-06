"use client";

import { useEffect, useState } from "react";
import Ably from "ably";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Viewer {
  id: string;
  name: string | null;
  image: string | null;
}

interface CollaboratorPresenceProps {
  communityId: string;
  documentId: string;
  currentUser: Viewer;
  className?: string;
}

export function CollaboratorPresence({
  communityId,
  documentId,
  currentUser,
  className,
}: CollaboratorPresenceProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);

  const channelName = `community:${communityId}:document:${documentId}`;

  useEffect(() => {
    let ably: Ably.Realtime | null = null;
    let channel: Ably.RealtimeChannel | null = null;

    async function connect() {
      try {
        // Get token from API
        const response = await fetch("/api/ably/token");
        if (!response.ok) {
          throw new Error("Failed to get Ably token");
        }
        const tokenRequest = await response.json();

        // Connect to Ably
        ably = new Ably.Realtime({
          authCallback: (_, callback) => {
            callback(null, tokenRequest);
          },
        });

        channel = ably.channels.get(channelName);

        // Enter presence
        await channel.presence.enter({
          id: currentUser.id,
          name: currentUser.name,
          image: currentUser.image,
        });

        // Get initial presence
        const members = await channel.presence.get();
        updateViewers(members);

        // Subscribe to presence changes
        channel.presence.subscribe("enter", () => {
          channel?.presence.get().then(updateViewers);
        });

        channel.presence.subscribe("leave", () => {
          channel?.presence.get().then(updateViewers);
        });

        channel.presence.subscribe("update", () => {
          channel?.presence.get().then(updateViewers);
        });

      } catch (err) {
        console.error("Failed to connect to presence:", err);
      }
    }

    function updateViewers(members: Ably.PresenceMessage[]) {
      const uniqueViewers = new Map<string, Viewer>();

      members.forEach((member) => {
        const data = member.data as Viewer;
        if (data?.id && data.id !== currentUser.id) {
          uniqueViewers.set(data.id, {
            id: data.id,
            name: data.name,
            image: data.image,
          });
        }
      });

      setViewers(Array.from(uniqueViewers.values()));
    }

    connect();

    // Cleanup on unmount
    return () => {
      if (channel) {
        channel.presence.leave();
        channel.unsubscribe();
      }
      if (ably) {
        ably.close();
      }
    };
  }, [channelName, currentUser]);

  if (viewers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex -space-x-2">
          {viewers.slice(0, 3).map((viewer) => (
            <Tooltip key={viewer.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-white ring-2 ring-primary-100">
                  <AvatarImage src={viewer.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {viewer.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewer.name || "Unknown"} is viewing</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {viewers.length > 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-background-muted text-xs font-medium text-foreground-muted ring-2 ring-primary-100">
                  +{viewers.length - 3}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {viewers
                    .slice(3)
                    .map((v) => v.name)
                    .join(", ")}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-sm text-foreground-muted">
          {viewers.length} {viewers.length === 1 ? "viewer" : "viewers"}
        </span>
      </div>
    </TooltipProvider>
  );
}
