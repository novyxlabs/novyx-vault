"use client";

import { useState, useEffect } from "react";
import { X, History, Lock, ArrowUpRight, RotateCcw } from "lucide-react";

interface RollbackMetadata {
  target_timestamp?: string;
  artifacts_restored?: number;
  artifacts_removed?: number;
  operations_undone?: number;
}

interface TimelineEntry {
  timestamp: string;
  operation: string;
  memory_id?: string;
  observation_preview?: string;
  importance?: number;
  content_hash?: string;
  metadata?: RollbackMetadata | null;
}

interface RollbackHistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return ts;
  }
}

function formatFullTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function RollbackHistoryView({ isOpen, onClose }: RollbackHistoryViewProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [allEntries, setAllEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(false);
    setIsLocked(false);

    Promise.all([
      fetch("/api/memory/replay?limit=200").then((r) => {
        if (r.status === 403) {
          setIsLocked(true);
          return { entries: [], total: 0 };
        }
        return r.ok ? r.json() : Promise.reject();
      }),
      fetch("/api/memory/usage").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([replayData, usageData]) => {
        const tier = usageData?.gating?.tier || usageData?.usage?.tier || "free";
        if (tier === "free" || tier === "starter") setIsLocked(true);

        const all: TimelineEntry[] = replayData.entries || [];
        setAllEntries(all);
        // Filter to rollback operations
        const rollbacks = all.filter(
          (e: TimelineEntry) => (e.operation || "").toLowerCase() === "rollback" || (e.operation || "").toLowerCase() === "restore"
        );
        setEntries(rollbacks);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Group rollbacks by date
  const grouped: { date: string; items: TimelineEntry[] }[] = [];
  for (const entry of entries) {
    const dateStr = (() => {
      try {
        return new Date(entry.timestamp).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
      } catch {
        return "Unknown";
      }
    })();
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateStr) {
      last.items.push(entry);
    } else {
      grouped.push({ date: dateStr, items: [entry] });
    }
  }

  // Count total memories affected
  const totalAffected = entries.reduce((sum, e) => {
    const restored = e.metadata?.artifacts_restored || 0;
    const removed = e.metadata?.artifacts_removed || 0;
    return sum + (restored + removed || 1);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg mx-4 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
              <History size={14} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Rollback History</h2>
              {!loading && !error && !isLocked && (
                <p className="text-[11px] text-muted">
                  {entries.length} rollback{entries.length !== 1 ? "s" : ""}
                  {totalAffected > 0 && ` · ${totalAffected} memor${totalAffected !== 1 ? "ies" : "y"} affected`}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-muted">Failed to load rollback history.</p>
              <p className="text-xs text-muted/60 mt-1">Make sure your Novyx API key is configured in Settings.</p>
            </div>
          )}

          {!loading && !error && isLocked && (
            <div className="relative">
              {/* Blurred placeholder */}
              <div className="p-6 space-y-4 blur-[6px] select-none pointer-events-none" aria-hidden>
                <div className="h-4 w-40 bg-muted-bg rounded" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 py-2">
                    <div className="w-8 h-8 bg-muted-bg rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-muted-bg rounded" />
                      <div className="h-2 w-1/2 bg-muted-bg rounded" />
                      <div className="flex gap-2">
                        <div className="h-12 flex-1 bg-muted-bg rounded" />
                        <div className="h-12 flex-1 bg-muted-bg rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-sidebar-bg/60 backdrop-blur-sm">
                <Lock size={32} className="text-accent/30 mb-3" />
                <p className="text-sm font-medium text-foreground">Rollback History</p>
                <p className="text-xs text-muted mt-1">Version history and rollbacks available on Pro</p>
                <a
                  href="https://novyx.ai/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Upgrade to Pro
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          )}

          {!loading && !error && !isLocked && entries.length === 0 && (
            <div className="text-center py-16 px-6">
              <RotateCcw size={32} className="text-muted/20 mx-auto mb-3" />
              <p className="text-sm text-muted">No rollbacks yet.</p>
              <p className="text-xs text-muted/50 mt-1">
                {allEntries.length > 0
                  ? `${allEntries.length} total operations in timeline — no rollbacks performed.`
                  : "Rollbacks will appear here when you revert memory changes."}
              </p>
            </div>
          )}

          {!loading && !error && !isLocked && entries.length > 0 && (
            <div className="px-6 py-4">
              {grouped.map((group, gi) => (
                <div key={group.date} className="mb-5 last:mb-0">
                  {/* Date header */}
                  <div className="text-[11px] uppercase tracking-widest text-muted/40 font-medium mb-2">
                    {group.date}
                  </div>

                  {/* Timeline */}
                  <div className="relative pl-6 border-l-2 border-sidebar-border/50 space-y-4">
                    {group.items.map((entry, i) => {
                      const globalIdx = gi * 10 + i;
                      return (
                        <div
                          key={`${entry.timestamp}-${i}`}
                          className="relative ghost-fade-in"
                          style={{ animationDelay: `${Math.min(globalIdx * 40, 400)}ms` }}
                        >
                          {/* Timeline dot */}
                          <div className="absolute -left-[calc(0.75rem+5px)] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-sidebar-bg" />

                          <div className="rounded-lg border border-sidebar-border bg-card-bg/50 p-3 hover:border-amber-400/30 transition-colors">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-400/10 text-amber-400">
                                  Rollback
                                </span>
                                {entry.metadata?.operations_undone && (
                                  <span className="text-[10px] text-muted bg-muted-bg px-1.5 py-0.5 rounded">
                                    {entry.metadata.operations_undone} op{entry.metadata.operations_undone !== 1 ? "s" : ""} undone
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted" title={formatFullTime(entry.timestamp)}>
                                {formatTime(entry.timestamp)}
                              </span>
                            </div>

                            {/* Content preview */}
                            {entry.observation_preview && (
                              <p className="text-sm text-foreground/80 leading-relaxed mb-2 line-clamp-2">
                                {entry.observation_preview}
                              </p>
                            )}

                            {/* Rollback metadata stats */}
                            {entry.metadata && (entry.metadata.artifacts_restored || entry.metadata.artifacts_removed) && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {entry.metadata.artifacts_restored != null && entry.metadata.artifacts_restored > 0 && (
                                  <div className="rounded-md bg-green-400/5 border border-green-400/10 p-2">
                                    <div className="text-[9px] uppercase tracking-widest text-green-400/60 font-medium mb-0.5">Restored</div>
                                    <span className="text-sm font-mono text-green-400">{entry.metadata.artifacts_restored}</span>
                                    <span className="text-[10px] text-muted ml-1">memories</span>
                                  </div>
                                )}
                                {entry.metadata.artifacts_removed != null && entry.metadata.artifacts_removed > 0 && (
                                  <div className="rounded-md bg-red-400/5 border border-red-400/10 p-2">
                                    <div className="text-[9px] uppercase tracking-widest text-red-400/60 font-medium mb-0.5">Removed</div>
                                    <span className="text-sm font-mono text-red-400">{entry.metadata.artifacts_removed}</span>
                                    <span className="text-[10px] text-muted ml-1">memories</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Target timestamp */}
                            {entry.metadata?.target_timestamp && (
                              <div className="mt-2 text-[11px] text-muted">
                                Rolled back to {formatFullTime(entry.metadata.target_timestamp)}
                              </div>
                            )}

                            {/* Memory ID + importance */}
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted">
                              {entry.memory_id && (
                                <span className="font-mono truncate max-w-[140px]" title={entry.memory_id}>
                                  {entry.memory_id.slice(0, 8)}
                                </span>
                              )}
                              {entry.importance != null && (
                                <>
                                  {entry.memory_id && <span className="text-muted/30">·</span>}
                                  <span>importance {entry.importance.toFixed(1)}</span>
                                </>
                              )}
                              {entry.content_hash && (
                                <>
                                  <span className="text-muted/30">·</span>
                                  <span className="font-mono text-amber-400/50 truncate max-w-[100px]" title={entry.content_hash}>
                                    #{entry.content_hash.replace(/^sha256:/, "").slice(0, 8)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
