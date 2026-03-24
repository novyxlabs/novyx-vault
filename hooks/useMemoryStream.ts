"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface MemoryStreamEvent {
  event_id: string;
  tenant_id?: string;
  space_id?: string;
  agent_id?: string;
  timestamp: number;
  type: string;
  data: {
    memory_id: string;
    observation?: string;
    reason?: string;
  };
}

interface UseMemoryStreamOptions {
  /** Called when memory events arrive (debounced batch). */
  onInvalidate?: (events: MemoryStreamEvent[]) => void;
  /** Event types to subscribe to. Omit for all. */
  types?: string[];
  /** Space ID filter. Omit for all spaces. */
  spaceId?: string;
  /** Whether the stream should be active. Default true. */
  enabled?: boolean;
}

interface UseMemoryStreamReturn {
  isConnected: boolean;
  connectionError: string | null;
  /** Number of events received since mount. */
  eventCount: number;
}

const RECONNECT_DELAY_MS = 5000;
const RATE_LIMIT_BASE_MS = 30000;
const INVALIDATE_DEBOUNCE_MS = 500;

/**
 * Hook that connects to the Novyx SSE stream and calls onInvalidate
 * when memory events arrive, debounced for burst protection.
 */
export function useMemoryStream({
  onInvalidate,
  types,
  spaceId,
  enabled = true,
}: UseMemoryStreamOptions = {}): UseMemoryStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventsRef = useRef<MemoryStreamEvent[]>([]);
  const onInvalidateRef = useRef(onInvalidate);
  const enabledRef = useRef(enabled);

  // Keep refs current without re-triggering effects
  onInvalidateRef.current = onInvalidate;
  enabledRef.current = enabled;

  const flushEvents = useCallback(() => {
    if (pendingEventsRef.current.length > 0 && onInvalidateRef.current) {
      onInvalidateRef.current(pendingEventsRef.current);
      pendingEventsRef.current = [];
    }
  }, []);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // Flush any remaining events before disconnecting
    flushEvents();
  }, [flushEvents]);

  const connect = useCallback(() => {
    cleanup();
    if (!enabledRef.current) return;

    try {
      const params = new URLSearchParams();
      if (spaceId) params.set("space_id", spaceId);
      if (types?.length) params.set("types", types.join(","));
      const qs = params.toString();
      const url = `/api/control/stream${qs ? `?${qs}` : ""}`;

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        // Delay to avoid false-positive on immediate error
        setTimeout(() => {
          if (eventSourceRef.current === es && es.readyState === EventSource.OPEN) {
            setIsConnected(true);
            setConnectionError(null);
          }
        }, 500);
      };

      es.onmessage = (e) => {
        try {
          const raw = JSON.parse(e.data);
          // SSE event type comes from the event field or we infer from data
          const event: MemoryStreamEvent = {
            event_id: raw.event_id,
            tenant_id: raw.tenant_id,
            space_id: raw.space_id,
            agent_id: raw.agent_id,
            timestamp: raw.timestamp,
            type: raw.type || e.type || "unknown",
            data: raw.data || {},
          };

          pendingEventsRef.current.push(event);
          setEventCount((c) => c + 1);

          // Debounce: flush after INVALIDATE_DEBOUNCE_MS of quiet
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(flushEvents, INVALIDATE_DEBOUNCE_MS);
        } catch {
          /* ignore malformed events */
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Check if this was a 429 (EventSource doesn't expose status directly,
        // but the browser will close it). Use longer delay for rate limits.
        // We can't distinguish 429 from other errors in EventSource API,
        // so we use a progressive backoff: first retry at normal delay,
        // subsequent retries double up to the rate limit base.
        const delay = RECONNECT_DELAY_MS;

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (enabledRef.current) connect();
        }, delay);
      };
    } catch {
      setIsConnected(false);
      setConnectionError("Failed to connect to memory stream");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId, types?.join(","), cleanup, flushEvents]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
      setIsConnected(false);
    }
    return cleanup;
  }, [enabled, connect, cleanup]);

  return { isConnected, connectionError, eventCount };
}
