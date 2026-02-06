"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { getAblyClient } from "@/hooks/use-ably";
import type Ably from "ably";
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

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "error";

interface PresenceContextValue {
  members: PresenceMember[];
  connectionStatus: ConnectionStatus;
  memberCount: number;
  retryConnection: () => void;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

interface CommunityPresenceProviderProps {
  children: ReactNode;
  communityId: string;
  currentUser: MemberData;
}

const RETRY_DELAYS = [5_000, 10_000, 30_000, 60_000, 120_000];
const SYNC_INTERVAL = 30_000;

/**
 * Community-level presence provider that manages a single Ably presence connection.
 * Uses the global Ably client singleton, adds periodic sync and retry logic.
 */
export function CommunityPresenceProvider({
  children,
  communityId,
  currentUser,
}: CommunityPresenceProviderProps) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const hasEnteredRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const presenceChannelName = `community:${communityId}:presence`;

  const syncMembers = useCallback(async () => {
    if (!channelRef.current || !mountedRef.current) return;
    try {
      const currentMembers = await channelRef.current.presence.get();
      if (mountedRef.current) {
        setMembers(
          currentMembers.map((m) => ({
            clientId: m.clientId,
            data: m.data as MemberData,
          }))
        );
      }
    } catch {
      // Sync failures are non-fatal — next interval will retry
    }
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    setConnectionStatus(retryCountRef.current > 0 ? "reconnecting" : "connecting");

    try {
      const client = await getAblyClient();
      if (!mountedRef.current) return;

      const channel = client.channels.get(presenceChannelName);
      channelRef.current = channel;

      // Subscribe to presence events
      channel.presence.subscribe("enter", (member) => {
        if (!mountedRef.current) return;
        setMembers((prev) => {
          if (prev.some((m) => m.clientId === member.clientId)) return prev;
          return [...prev, { clientId: member.clientId, data: member.data as MemberData }];
        });
      });

      channel.presence.subscribe("leave", (member) => {
        if (!mountedRef.current) return;
        setMembers((prev) =>
          prev.filter((m) => m.clientId !== member.clientId)
        );
      });

      channel.presence.subscribe("update", (member) => {
        if (!mountedRef.current) return;
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
      if (!mountedRef.current) return;

      setMembers(
        currentMembers.map((m) => ({
          clientId: m.clientId,
          data: m.data as MemberData,
        }))
      );
      setConnectionStatus("connected");
      retryCountRef.current = 0;

      // Start periodic sync
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = setInterval(syncMembers, SYNC_INTERVAL);
    } catch (err) {
      if (!mountedRef.current) return;

      const isRateLimit = err instanceof Error && err.message.includes("Rate limit");
      if (!isRateLimit) {
        console.error("Community presence error:", err);
        Sentry.captureException(err, {
          tags: { service: "ably", type: "community_presence" },
          extra: { communityId, retryCount: retryCountRef.current },
        });
      }

      // Auto-retry with exponential backoff
      if (retryCountRef.current < RETRY_DELAYS.length) {
        setConnectionStatus("reconnecting");
        const delay = RETRY_DELAYS[retryCountRef.current];
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      } else {
        setConnectionStatus("error");
      }
    }
  }, [presenceChannelName, currentUser.id, currentUser.name, currentUser.image, communityId, syncMembers]);

  const retryConnection = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;

    connect();

    return () => {
      mountedRef.current = false;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      // Leave presence and cleanup
      if (channelRef.current && hasEnteredRef.current) {
        channelRef.current.presence.leave().catch(() => {});
        channelRef.current.presence.unsubscribe();
      }

      channelRef.current = null;
      hasEnteredRef.current = false;
    };
  }, [connect]);

  return (
    <PresenceContext.Provider
      value={{
        members,
        connectionStatus,
        memberCount: members.length,
        retryConnection,
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
