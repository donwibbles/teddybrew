"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Ably from "ably";

// Global Ably client singleton for client-side
let ablyClient: Ably.Realtime | null = null;
let connectionPromise: Promise<Ably.Realtime> | null = null;

async function getAblyClient(): Promise<Ably.Realtime> {
  if (ablyClient?.connection.state === "connected") {
    return ablyClient;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch("/api/ably/token");
      if (!response.ok) {
        throw new Error("Failed to get Ably token");
      }
      const tokenRequest = await response.json();

      ablyClient = new Ably.Realtime({
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
        ...tokenRequest,
      });

      ablyClient.connection.on("connected", () => {
        resolve(ablyClient!);
      });

      ablyClient.connection.on("failed", (err) => {
        reject(err);
      });
    } catch (error) {
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise;
}

export interface AblyMessage {
  id: string;
  name: string;
  data: unknown;
  timestamp: number;
  clientId?: string;
}

export interface PresenceMember {
  clientId: string;
  data?: unknown;
}

/**
 * Hook for subscribing to an Ably channel
 */
export function useAblyChannel(
  channelName: string | null,
  eventName: string = "*",
  onMessage?: (message: AblyMessage) => void
) {
  const [messages, setMessages] = useState<AblyMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep callback ref updated
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!channelName) return;

    let mounted = true;

    async function connect() {
      try {
        const client = await getAblyClient();
        if (!mounted || !channelName) return;

        const channel = client.channels.get(channelName);
        channelRef.current = channel;

        await channel.subscribe(eventName, (message) => {
          if (!mounted) return;
          const ablyMessage: AblyMessage = {
            id: message.id || crypto.randomUUID(),
            name: message.name || eventName,
            data: message.data,
            timestamp: message.timestamp || Date.now(),
            clientId: message.clientId,
          };
          setMessages((prev) => [...prev, ablyMessage]);
          onMessageRef.current?.(ablyMessage);
        });

        setIsConnected(true);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err as Error);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelName, eventName]);

  const publish = useCallback(
    async (event: string, data: unknown) => {
      if (!channelRef.current) {
        throw new Error("Channel not connected");
      }
      await channelRef.current.publish(event, data);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isConnected,
    error,
    publish,
    clearMessages,
  };
}

/**
 * Hook for Ably presence
 */
export function useAblyPresence(
  channelName: string | null,
  data?: unknown
) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelName) return;

    let mounted = true;

    async function connect() {
      try {
        const client = await getAblyClient();
        if (!mounted || !channelName) return;

        const channel = client.channels.get(channelName);
        channelRef.current = channel;

        // Subscribe to presence events
        channel.presence.subscribe("enter", (member) => {
          if (!mounted) return;
          setMembers((prev) => {
            if (prev.some((m) => m.clientId === member.clientId)) return prev;
            return [...prev, { clientId: member.clientId, data: member.data }];
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
                ? { clientId: member.clientId, data: member.data }
                : m
            )
          );
        });

        // Enter presence and get current members
        await channel.presence.enter(data);
        const currentMembers = await channel.presence.get();
        if (mounted) {
          setMembers(
            currentMembers.map((m) => ({
              clientId: m.clientId,
              data: m.data,
            }))
          );
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err as Error);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.presence.leave();
        channelRef.current.presence.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelName, data]);

  const updatePresence = useCallback(async (newData: unknown) => {
    if (!channelRef.current) return;
    await channelRef.current.presence.update(newData);
  }, []);

  return {
    members,
    isConnected,
    error,
    updatePresence,
    memberCount: members.length,
  };
}

/**
 * Hook to get current connection state
 */
export function useAblyConnection() {
  const [state, setState] = useState<string>("initialized");

  useEffect(() => {
    let mounted = true;

    async function checkConnection() {
      try {
        const client = await getAblyClient();
        if (!mounted) return;

        setState(client.connection.state);

        client.connection.on((stateChange) => {
          if (mounted) {
            setState(stateChange.current);
          }
        });
      } catch {
        if (mounted) {
          setState("failed");
        }
      }
    }

    checkConnection();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
