"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Ably from "ably";
import * as Sentry from "@sentry/nextjs";

// Global Ably client singleton for client-side
let ablyClient: Ably.Realtime | null = null;
let connectionPromise: Promise<Ably.Realtime> | null = null;
let connectionState: "disconnected" | "connecting" | "connected" | "failed" = "disconnected";

export async function getAblyClient(): Promise<Ably.Realtime> {
  // Return existing connected client
  if (ablyClient && connectionState === "connected") {
    return ablyClient;
  }

  // Return existing connection promise if connecting
  if (connectionPromise && connectionState === "connecting") {
    return connectionPromise;
  }

  connectionState = "connecting";

  connectionPromise = createAblyConnection();
  return connectionPromise;
}

async function createAblyConnection(): Promise<Ably.Realtime> {
  // Fetch token first (async work outside Promise executor)
  const response = await fetch("/api/ably/token");
  if (!response.ok) {
    connectionState = "failed";
    connectionPromise = null;
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

  // Return Promise for connection events (no async executor needed)
  return new Promise((resolve, reject) => {
    ablyClient!.connection.on("connected", () => {
      connectionState = "connected";
      resolve(ablyClient!);
    });

    ablyClient!.connection.on("failed", (err) => {
      connectionState = "failed";
      connectionPromise = null;
      // Capture Ably connection failure in Sentry
      Sentry.captureException(err, {
        tags: { service: "ably", type: "connection_failure" },
      });
      reject(err);
    });

    ablyClient!.connection.on("disconnected", () => {
      connectionState = "disconnected";
    });

    ablyClient!.connection.on("suspended", () => {
      connectionState = "disconnected";
    });
  });
}

export interface AblyMessage {
  id: string;
  name: string;
  data: unknown;
  timestamp: number;
  clientId?: string;
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

    // Capture ref value at effect start to avoid stale ref in cleanup
    const queue = messageQueueRef.current;

    return () => {
      mounted = false;
      if (queue.timeout) {
        clearTimeout(queue.timeout);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelName, eventName, queueMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    processedIdsRef.current.clear();
  }, []);

  return {
    messages,
    isConnected,
    error,
    clearMessages,
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
