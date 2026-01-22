"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Ably from "ably";
import * as Sentry from "@sentry/nextjs";

// Global Ably client singleton for client-side
let ablyClient: Ably.Realtime | null = null;
let connectionPromise: Promise<Ably.Realtime> | null = null;
let connectionState: "disconnected" | "connecting" | "connected" | "failed" = "disconnected";

async function getAblyClient(): Promise<Ably.Realtime> {
  // Return existing connected client
  if (ablyClient && connectionState === "connected") {
    return ablyClient;
  }

  // Return existing connection promise if connecting
  if (connectionPromise && connectionState === "connecting") {
    return connectionPromise;
  }

  connectionState = "connecting";

  connectionPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch("/api/ably/token");
      if (!response.ok) {
        throw new Error("Failed to get Ably token");
      }
      const tokenRequest = await response.json();

      // Close existing client if any
      if (ablyClient) {
        ablyClient.close();
        ablyClient = null;
      }

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
        disconnectedRetryTimeout: 5000,
        suspendedRetryTimeout: 10000,
        ...tokenRequest,
      });

      ablyClient.connection.on("connected", () => {
        connectionState = "connected";
        resolve(ablyClient!);
      });

      ablyClient.connection.on("failed", (err) => {
        connectionState = "failed";
        connectionPromise = null;
        // Capture Ably connection failure in Sentry
        Sentry.captureException(err, {
          tags: { service: "ably", type: "connection_failure" },
        });
        reject(err);
      });

      ablyClient.connection.on("disconnected", () => {
        connectionState = "disconnected";
      });

      ablyClient.connection.on("suspended", () => {
        connectionState = "disconnected";
      });
    } catch (error) {
      connectionState = "failed";
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

// Message queue for throttling
interface MessageQueue {
  messages: AblyMessage[];
  timeout: NodeJS.Timeout | null;
}

/**
 * Hook for subscribing to an Ably channel with message throttling
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
  const messageQueueRef = useRef<MessageQueue>({ messages: [], timeout: null });
  const processedIdsRef = useRef<Set<string>>(new Set());

  // Keep callback ref updated
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Process queued messages in batches to avoid rate limits
  const processMessageQueue = useCallback(() => {
    const queue = messageQueueRef.current;
    if (queue.messages.length === 0) return;

    const messagesToProcess = queue.messages;
    queue.messages = [];
    queue.timeout = null;

    // Deduplicate messages
    const uniqueMessages = messagesToProcess.filter((msg) => {
      if (processedIdsRef.current.has(msg.id)) return false;
      processedIdsRef.current.add(msg.id);
      // Keep set from growing too large
      if (processedIdsRef.current.size > 1000) {
        const ids = Array.from(processedIdsRef.current);
        processedIdsRef.current = new Set(ids.slice(-500));
      }
      return true;
    });

    if (uniqueMessages.length > 0) {
      setMessages((prev) => [...prev, ...uniqueMessages]);
      uniqueMessages.forEach((msg) => onMessageRef.current?.(msg));
    }
  }, []);

  // Queue a message for processing
  const queueMessage = useCallback(
    (message: AblyMessage) => {
      const queue = messageQueueRef.current;
      queue.messages.push(message);

      // Process immediately if queue is small, otherwise batch
      if (queue.messages.length === 1) {
        // First message - set a short timeout to batch with any rapid followers
        queue.timeout = setTimeout(processMessageQueue, 50);
      } else if (queue.messages.length >= 10) {
        // Queue is getting large - process now
        if (queue.timeout) clearTimeout(queue.timeout);
        processMessageQueue();
      }
    },
    [processMessageQueue]
  );

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
          queueMessage(ablyMessage);
        });

        setIsConnected(true);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error("Ably connection error:", err);
        // Capture channel subscription errors in Sentry
        Sentry.captureException(err, {
          tags: { service: "ably", type: "channel_subscription" },
          extra: { channelName },
        });
        setError(err as Error);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      mounted = false;
      if (messageQueueRef.current.timeout) {
        clearTimeout(messageQueueRef.current.timeout);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelName, eventName, queueMessage]);

  const publish = useCallback(async (event: string, data: unknown) => {
    if (!channelRef.current) {
      throw new Error("Channel not connected");
    }
    try {
      await channelRef.current.publish(event, data);
    } catch (err) {
      // Handle rate limit errors gracefully
      if (err instanceof Error && err.message.includes("Rate limit")) {
        console.warn("Ably rate limit hit, message queued for retry");
        // Retry after a delay
        setTimeout(() => {
          channelRef.current?.publish(event, data).catch(console.error);
        }, 1000);
      } else {
        throw err;
      }
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    processedIdsRef.current.clear();
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
export function useAblyPresence(channelName: string | null, data?: unknown) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const hasEnteredRef = useRef(false);

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
        if (!hasEnteredRef.current) {
          await channel.presence.enter(data);
          hasEnteredRef.current = true;
        }

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
        console.error("Ably presence error:", err);
        // Capture presence errors in Sentry
        Sentry.captureException(err, {
          tags: { service: "ably", type: "presence" },
          extra: { channelName },
        });
        setError(err as Error);
        setIsConnected(false);
      }
    }

    connect();

    return () => {
      mounted = false;
      if (channelRef.current && hasEnteredRef.current) {
        channelRef.current.presence.leave().catch(console.error);
        channelRef.current.presence.unsubscribe();
        hasEnteredRef.current = false;
        channelRef.current = null;
      }
    };
  }, [channelName, data]);

  const updatePresence = useCallback(async (newData: unknown) => {
    if (!channelRef.current) return;
    try {
      await channelRef.current.presence.update(newData);
    } catch (err) {
      console.error("Failed to update presence:", err);
    }
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
