"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import Ably from "ably";
import * as Sentry from "@sentry/nextjs";

interface MemberData {
  id: string;
  name: string | null;
  image: string | null;
}

interface PresenceMember {
  clientId: string;
  data?: MemberData;
}

interface PresenceContextValue {
  members: PresenceMember[];
  isConnected: boolean;
  memberCount: number;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

interface CommunityPresenceProviderProps {
  children: ReactNode;
  communityId: string;
  currentUser: MemberData;
}

/**
 * Community-level presence provider that manages a single Ably presence connection.
 * This provider enters presence once when mounted and leaves when unmounted,
 * preventing rate limit issues from component mount/unmount cycles.
 */
export function CommunityPresenceProvider({
  children,
  communityId,
  currentUser,
}: CommunityPresenceProviderProps) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const hasEnteredRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const presenceChannelName = `community:${communityId}:presence`;

    async function connect() {
      try {
        // Fetch token and create a dedicated client for this presence connection
        const response = await fetch("/api/ably/token");
        if (!response.ok) {
          throw new Error("Failed to get Ably token");
        }
        const tokenRequest = await response.json();

        if (!mounted) return;

        const client = new Ably.Realtime({
          authCallback: async (_, callback) => {
            try {
              const res = await fetch("/api/ably/token");
              if (!res.ok) throw new Error("Token refresh failed");
              const token = await res.json();
              callback(null, token);
            } catch (err) {
              callback(err instanceof Error ? err.message : String(err), null);
            }
          },
          disconnectedRetryTimeout: 5000,
          suspendedRetryTimeout: 10000,
          ...tokenRequest,
        });

        clientRef.current = client;

        // Wait for connection
        await new Promise<void>((resolve, reject) => {
          client.connection.on("connected", () => resolve());
          client.connection.on("failed", (err) => reject(err));
        });

        if (!mounted) {
          client.close();
          return;
        }

        const channel = client.channels.get(presenceChannelName);
        channelRef.current = channel;

        // Subscribe to presence events
        channel.presence.subscribe("enter", (member) => {
          if (!mounted) return;
          setMembers((prev) => {
            if (prev.some((m) => m.clientId === member.clientId)) return prev;
            return [...prev, { clientId: member.clientId, data: member.data as MemberData }];
          });
        });

        channel.presence.subscribe("leave", (member) => {
          if (!mounted) return;
          setMembers((prev) =>
            prev.filter((m) => m.clientId !== member.clientId)
          );
        });

        channel.presence.subscribe("update", (member) => {
          if (!mounted) return;
          setMembers((prev) =>
            prev.map((m) =>
              m.clientId === member.clientId
                ? { clientId: member.clientId, data: member.data as MemberData }
                : m
            )
          );
        });

        // Enter presence once
        if (!hasEnteredRef.current) {
          await channel.presence.enter({
            id: currentUser.id,
            name: currentUser.name,
            image: currentUser.image,
          });
          hasEnteredRef.current = true;
        }

        // Get current members
        const currentMembers = await channel.presence.get();
        if (mounted) {
          setMembers(
            currentMembers.map((m) => ({
              clientId: m.clientId,
              data: m.data as MemberData,
            }))
          );
          setIsConnected(true);
        }
      } catch (err) {
        if (!mounted) return;

        const isRateLimit = err instanceof Error && err.message.includes("Rate limit");
        if (!isRateLimit) {
          console.error("Community presence error:", err);
          Sentry.captureException(err, {
            tags: { service: "ably", type: "community_presence" },
            extra: { communityId },
          });
        }
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      mounted = false;

      // Leave presence and cleanup
      if (channelRef.current && hasEnteredRef.current) {
        channelRef.current.presence.leave().catch(() => {});
        channelRef.current.presence.unsubscribe();
      }

      // Close dedicated client
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }

      channelRef.current = null;
      hasEnteredRef.current = false;
    };
  }, [communityId, currentUser.id, currentUser.name, currentUser.image]);

  return (
    <PresenceContext.Provider
      value={{
        members,
        isConnected,
        memberCount: members.length,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

/**
 * Hook for consuming presence data within a CommunityPresenceProvider.
 * This is a read-only hook - it does not trigger enter/leave operations.
 * @throws Error if used outside of CommunityPresenceProvider
 */
export function usePresenceContext(): PresenceContextValue {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error(
      "usePresenceContext must be used within a CommunityPresenceProvider"
    );
  }
  return context;
}
