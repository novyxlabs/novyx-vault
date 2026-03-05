"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, X, ExternalLink } from "lucide-react";

interface GhostNotificationProps {
  notePath: string;
  content: string;
  onSelectNote?: (path: string) => void;
}

interface Notification {
  type: "memory" | "note";
  title: string;
  body: string;
  notePath?: string;
  relevance: number;
}

// Cooldown: minimum 2 minutes between notifications
const COOLDOWN_MS = 2 * 60 * 1000;
// Debounce: wait 8 seconds after user stops typing
const DEBOUNCE_MS = 8000;
// Minimum content change (characters) to trigger a check
const MIN_CHANGE_CHARS = 100;
// Minimum content length to trigger a check
const MIN_CONTENT_LENGTH = 200;
// Auto-dismiss after 12 seconds
const AUTO_DISMISS_MS = 12000;

export default function GhostNotification({
  notePath,
  content,
  onSelectNote,
}: GhostNotificationProps) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  // Refs for tracking state across renders
  const lastCheckedContentLengthRef = useRef(0);
  const lastNotifyTimeRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastNotePathRef = useRef(notePath);
  const queueRef = useRef<Notification[]>([]);

  // Reset when note changes
  useEffect(() => {
    if (notePath !== lastNotePathRef.current) {
      lastNotePathRef.current = notePath;
      lastCheckedContentLengthRef.current = 0;
      setNotification(null);
      setIsVisible(false);
      setIsDismissing(false);
      setQueueCount(0);
      queueRef.current = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      abortRef.current?.abort();
    }
  }, [notePath]);

  const dismiss = useCallback(() => {
    setIsDismissing(true);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    // Wait for slide-out animation
    setTimeout(() => {
      setNotification(null);
      setIsVisible(false);
      setIsDismissing(false);
      // Show next queued notification if any
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setQueueCount(queueRef.current.length);
        // Small delay before showing next
        setTimeout(() => {
          setNotification(next);
          setIsVisible(true);
          setIsDismissing(false);
          lastNotifyTimeRef.current = Date.now();
          dismissTimerRef.current = setTimeout(() => {
            dismiss();
          }, AUTO_DISMISS_MS);
        }, 400);
      }
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showNotification = useCallback(
    (n: Notification) => {
      if (isVisible) {
        // Queue it instead of dropping — but cap queue at 5
        if (queueRef.current.length < 5) {
          queueRef.current.push(n);
          setQueueCount(queueRef.current.length);
        }
        return;
      }

      setNotification(n);
      setIsVisible(true);
      setIsDismissing(false);
      lastNotifyTimeRef.current = Date.now();

      // Auto-dismiss after 12 seconds
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);
    },
    [dismiss, isVisible]
  );

  // Debounced content watcher
  useEffect(() => {
    // Don't check if content is too short
    if (content.length < MIN_CONTENT_LENGTH) return;

    // Don't check if not enough has changed
    const charDelta = Math.abs(
      content.length - lastCheckedContentLengthRef.current
    );
    if (charDelta < MIN_CHANGE_CHARS) return;

    // Don't check if in cooldown
    const timeSinceLastNotify = Date.now() - lastNotifyTimeRef.current;
    if (timeSinceLastNotify < COOLDOWN_MS) return;

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      // Double-check cooldown (might have changed during debounce)
      const timeSince = Date.now() - lastNotifyTimeRef.current;
      if (timeSince < COOLDOWN_MS) return;

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/notes/ghost-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, notePath }),
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = await res.json();
        lastCheckedContentLengthRef.current = content.length;

        if (data.notification) {
          showNotification(data.notification);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Silently fail — ghost notifications are optional
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [content, notePath, showNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  if (!notification || !isVisible) return null;

  const animationClass = isDismissing
    ? "ghost-notify-slide-out"
    : "ghost-notify-slide-in";

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 w-80 ${animationClass}`}
      role="alert"
      aria-live="polite"
    >
      <div className="relative bg-card-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden ghost-notify-glow">
        {/* Glow border effect */}
        <div className="absolute inset-0 rounded-xl border border-purple-500/20 ghost-notify-pulse pointer-events-none" />

        {/* Content */}
        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
                Ghost found a connection
              </span>
              {queueCount > 0 && (
                <span className="text-[10px] font-bold text-white bg-purple-500 rounded-full w-4.5 h-4.5 flex items-center justify-center px-1.5 py-0.5 min-w-[18px]">
                  +{queueCount}
                </span>
              )}
            </div>
            <button
              onClick={dismiss}
              className="p-1 rounded-md text-muted hover:text-foreground hover:bg-muted-bg transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>

          {/* Title */}
          <p className="text-sm font-medium text-foreground mb-1">
            &ldquo;{notification.title}&rdquo;
          </p>

          {/* Body */}
          <p className="text-xs text-muted leading-relaxed line-clamp-3 mb-3">
            {notification.body}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            {notification.type === "note" && notification.notePath ? (
              <button
                onClick={() => {
                  onSelectNote?.(notification.notePath!);
                  dismiss();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/25 transition-colors"
              >
                <ExternalLink size={12} />
                View Note
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={dismiss}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Relevance indicator bar */}
        <div className="h-0.5 bg-sidebar-border">
          <div
            className="h-full bg-purple-500/50 transition-all"
            style={{ width: `${Math.round(notification.relevance * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
