"use client";

import { useState, useEffect } from "react";
import { X, Shield, Lock, ArrowUpRight, Filter, CheckCircle2, Link2 } from "lucide-react";

interface AuditEntry {
  timestamp: string;
  operation: string;
  artifact_id?: string;
  entry_hash?: string;
  details?: Record<string, unknown>;
}

interface AuditTrailViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPERATIONS = ["all", "store", "update", "delete", "rollback"] as const;
type OpFilter = (typeof OPERATIONS)[number];

const OP_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  store: { bg: "bg-green-400/10", text: "text-green-400", label: "Store" },
  update: { bg: "bg-blue-400/10", text: "text-blue-400", label: "Update" },
  delete: { bg: "bg-red-400/10", text: "text-red-400", label: "Delete" },
  rollback: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Rollback" },
  recall: { bg: "bg-purple-400/10", text: "text-purple-400", label: "Recall" },
  forget: { bg: "bg-red-400/10", text: "text-red-400", label: "Forget" },
};

function getOpStyle(op: string | undefined) {
  if (!op) return { bg: "bg-muted-bg", text: "text-muted", label: "Unknown" };
  const key = op.toLowerCase();
  return OP_COLORS[key] || { bg: "bg-muted-bg", text: "text-muted", label: op };
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

function extractPreview(entry: AuditEntry): string | null {
  const d = entry.details;
  if (!d) return null;
  // Audit entries have method + endpoint, not content
  const method = d.method as string | undefined;
  const endpoint = d.endpoint as string | undefined;
  if (method && endpoint) return `${method} ${endpoint}`;
  const obs = d.observation || d.content || d.memory || d.preview;
  if (typeof obs === "string") return obs.length > 120 ? obs.slice(0, 120) + "…" : obs;
  return null;
}

function extractHash(entry: AuditEntry): string | null {
  if (entry.entry_hash) return entry.entry_hash;
  const d = entry.details;
  if (!d) return null;
  const hash = d.entry_hash || d.hash || d.integrity_hash;
  if (typeof hash === "string") return hash;
  return null;
}

export default function AuditTrailView({ isOpen, onClose }: AuditTrailViewProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<OpFilter>("all");
  const [tier, setTier] = useState<string>("free");
  const [chainHead, setChainHead] = useState<string | null>(null);
  const [chainLength, setChainLength] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(false);

    Promise.all([
      fetch("/api/memory/audit?limit=100").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/memory/usage").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([auditData, usageData]) => {
        setEntries(auditData.entries || []);
        setChainHead(auditData.chain_head || null);
        setChainLength(auditData.chain_length || 0);
        setTier(usageData?.gating?.tier || usageData?.usage?.tier || "free");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const isLocked = tier === "free" || tier === "starter";
  const filtered = filter === "all" ? entries : entries.filter((e) => (e.operation || "").toLowerCase() === filter);

  // Count by operation type
  const counts: Record<string, number> = {};
  for (const e of entries) {
    const key = (e.operation || "unknown").toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  }

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
            <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center">
              <Shield size={14} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Audit Trail</h2>
              {!loading && !error && (
                <p className="text-[11px] text-muted">{entries.length} operations</p>
              )}
            </div>
            {!loading && !error && !isLocked && chainHead && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-400/10 border border-emerald-400/20 mr-auto">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">Chain intact</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Filter bar */}
        {!loading && !error && !isLocked && entries.length > 0 && (
          <div className="px-6 py-2.5 border-b border-sidebar-border/50 flex items-center gap-1.5 overflow-x-auto">
            <Filter size={12} className="text-muted/40 shrink-0 mr-1" />
            {OPERATIONS.map((op) => {
              const isActive = filter === op;
              const style = op === "all" ? null : getOpStyle(op);
              const count = op === "all" ? entries.length : (counts[op] || 0);
              if (op !== "all" && count === 0) return null;
              return (
                <button
                  key={op}
                  onClick={() => setFilter(op)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? style
                        ? `${style.bg} ${style.text}`
                        : "bg-accent/10 text-accent"
                      : "text-muted hover:text-foreground hover:bg-muted-bg"
                  }`}
                >
                  {op === "all" ? "All" : style?.label || op} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-muted">Failed to load audit trail.</p>
              <p className="text-xs text-muted/60 mt-1">Make sure your Novyx API key is configured in Settings.</p>
            </div>
          )}

          {!loading && !error && isLocked && (
            <div className="relative">
              {/* Blurred placeholder */}
              <div className="p-6 space-y-3 blur-[6px] select-none pointer-events-none" aria-hidden>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <div className="w-16 h-5 bg-muted-bg rounded" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 bg-muted-bg rounded" />
                      <div className="h-2 w-1/2 bg-muted-bg rounded" />
                    </div>
                    <div className="h-3 w-12 bg-muted-bg rounded" />
                  </div>
                ))}
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-sidebar-bg/60 backdrop-blur-sm">
                <Lock size={32} className="text-accent/30 mb-3" />
                <p className="text-sm font-medium text-foreground">Audit Trail</p>
                <p className="text-xs text-muted mt-1">Full operation history available on Pro</p>
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

          {!loading && !error && !isLocked && filtered.length === 0 && (
            <div className="text-center py-16 px-6">
              <Shield size={32} className="text-muted/20 mx-auto mb-3" />
              <p className="text-sm text-muted">
                {filter === "all" ? "No operations recorded yet." : `No ${filter} operations found.`}
              </p>
            </div>
          )}

          {!loading && !error && !isLocked && filtered.length > 0 && (
            <div className="divide-y divide-sidebar-border/30">
              {filtered.map((entry, i) => {
                const style = getOpStyle(entry.operation);
                const preview = extractPreview(entry);
                const hash = extractHash(entry);

                return (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="px-6 py-3 hover:bg-muted-bg/30 transition-colors ghost-fade-in"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Badge */}
                      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {preview && (
                          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2 mb-0.5">
                            {preview}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-muted flex-wrap">
                          <span title={formatFullTime(entry.timestamp)}>
                            {formatTime(entry.timestamp)}
                          </span>
                          {typeof entry.details?.status === "number" && (
                            <>
                              <span className="text-muted/30">·</span>
                              <span className={`font-mono ${entry.details.status < 300 ? "text-green-400/70" : "text-red-400/70"}`}>
                                {entry.details.status}
                              </span>
                            </>
                          )}
                          {hash && (
                            <>
                              <span className="text-muted/30">·</span>
                              <span className="font-mono text-emerald-400/60 truncate max-w-[120px]" title={hash}>
                                #{hash.replace(/^sha256:/, "").slice(0, 10)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chain head footer */}
          {!loading && !error && !isLocked && chainHead && (
            <div className="px-6 py-3 border-t border-sidebar-border/50">
              <div className="flex items-center gap-2 text-[11px] text-muted">
                <Link2 size={11} className="text-emerald-400/60" />
                <span>Chain head</span>
                <span className="font-mono text-emerald-400/70 truncate max-w-[200px]" title={chainHead}>
                  #{chainHead.replace(/^sha256:/, "").slice(0, 16)}
                </span>
                <span className="text-muted/30">·</span>
                <span>{chainLength} hashed entries</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
