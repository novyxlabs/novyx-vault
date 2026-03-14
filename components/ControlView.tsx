"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldCheck,
  Clock,
  History,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Zap,
  Bot,
  ShieldAlert,
} from "lucide-react";

interface ControlAction {
  id: string;
  agent_id?: string;
  agent_name?: string;
  action_type: string;
  description?: string;
  status: string;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  details?: Record<string, unknown>;
}

interface PolicyRule {
  action: string;
  effect: "allow" | "deny" | "require_approval";
  scope?: string;
  conditions?: Record<string, unknown>;
}

interface ControlPolicy {
  id: string;
  name: string;
  description?: string;
  rules: PolicyRule[];
}

interface ControlViewProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "pending" | "history" | "policies";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_approval: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Pending" },
  approved: { bg: "bg-green-400/10", text: "text-green-400", label: "Approved" },
  denied: { bg: "bg-red-400/10", text: "text-red-400", label: "Denied" },
  executed: { bg: "bg-blue-400/10", text: "text-blue-400", label: "Executed" },
  failed: { bg: "bg-red-400/10", text: "text-red-400", label: "Failed" },
};

const EFFECT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  allow: { bg: "bg-green-400/10", text: "text-green-400", label: "Allow" },
  deny: { bg: "bg-red-400/10", text: "text-red-400", label: "Deny" },
  require_approval: { bg: "bg-amber-400/10", text: "text-amber-400", label: "Require Approval" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] || { bg: "bg-muted-bg", text: "text-muted", label: status };
}

function getEffectStyle(effect: string) {
  return EFFECT_STYLES[effect] || { bg: "bg-muted-bg", text: "text-muted", label: effect };
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

export default function ControlView({ isOpen, onClose }: ControlViewProps) {
  const [tab, setTab] = useState<Tab>("pending");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Pending approvals
  const [pending, setPending] = useState<ControlAction[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Action history
  const [history, setHistory] = useState<ControlAction[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Policies
  const [policies, setPolicies] = useState<ControlPolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/control/approvals?status=pending_approval&limit=50");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConnected(data.connected ?? true);
      setPending(data.approvals || data.actions || []);
    } catch {
      setError(true);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(false);
    fetchPending().finally(() => setLoading(false));
  }, [isOpen, fetchPending]);

  // Load history tab
  useEffect(() => {
    if (!isOpen || tab !== "history" || !connected) return;
    setHistoryLoading(true);
    fetch("/api/control/actions?limit=100")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setHistory(data.actions || []);
        setHistoryTotal(data.total || 0);
      })
      .catch(() => setError(true))
      .finally(() => setHistoryLoading(false));
  }, [isOpen, tab, connected]);

  // Load policies tab
  useEffect(() => {
    if (!isOpen || tab !== "policies" || !connected) return;
    setPoliciesLoading(true);
    fetch("/api/control/policies")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setPolicies(data.policies || []))
      .catch(() => setError(true))
      .finally(() => setPoliciesLoading(false));
  }, [isOpen, tab, connected]);

  const handleDecision = async (id: string, decision: "approved" | "denied") => {
    setDecidingId(id);
    try {
      const res = await fetch(`/api/control/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to submit decision");
        return;
      }
      // Remove from pending list
      setPending((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Failed to submit decision");
    } finally {
      setDecidingId(null);
    }
  };

  if (!isOpen) return null;

  const pendingCount = pending.length;

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
            <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center">
              <ShieldCheck size={14} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Control</h2>
              {!loading && connected && (
                <p className="text-[11px] text-muted">Governed action plane</p>
              )}
            </div>
            {!loading && connected && pendingCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-400/10 border border-amber-400/20">
                <AlertCircle size={12} className="text-amber-400" />
                <span className="text-[10px] font-medium text-amber-400">
                  {pendingCount} pending
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        {!loading && connected && (
          <div className="px-6 py-2.5 border-b border-sidebar-border/50 flex items-center gap-1.5">
            <button
              onClick={() => setTab("pending")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                tab === "pending"
                  ? "bg-amber-400/10 text-amber-400"
                  : "text-muted hover:text-foreground hover:bg-muted-bg"
              }`}
            >
              <Clock size={12} />
              Pending
              {pendingCount > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  tab === "pending" ? "bg-amber-400/20" : "bg-muted-bg"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("history")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                tab === "history"
                  ? "bg-blue-400/10 text-blue-400"
                  : "text-muted hover:text-foreground hover:bg-muted-bg"
              }`}
            >
              <History size={12} />
              History
            </button>
            <button
              onClick={() => setTab("policies")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                tab === "policies"
                  ? "bg-violet-400/10 text-violet-400"
                  : "text-muted hover:text-foreground hover:bg-muted-bg"
              }`}
            >
              <FileText size={12} />
              Policies
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-16 px-6">
              <p className="text-sm text-muted">Failed to load Control data.</p>
              <p className="text-xs text-muted/60 mt-1">
                Make sure your Novyx API key is configured in Settings.
              </p>
            </div>
          )}

          {/* No actions empty state */}
          {!loading && !error && connected === false && (
            <div className="text-center py-16 px-6">
              <ShieldAlert size={36} className="text-muted/20 mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground">
                No governed actions yet
              </p>
              <p className="text-xs text-muted mt-2 max-w-xs mx-auto leading-relaxed">
                When agents take actions through Novyx Control, they&apos;ll appear here for review.
              </p>
            </div>
          )}

          {/* Pending tab */}
          {!loading && !error && connected && tab === "pending" && (
            <>
              {pending.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <CheckCircle2 size={32} className="text-green-400/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">No pending approvals</p>
                  <p className="text-xs text-muted/60 mt-1">All agent actions have been reviewed.</p>
                </div>
              ) : (
                <div className="divide-y divide-sidebar-border/30">
                  {pending.map((action, i) => (
                    <PendingActionCard
                      key={action.id}
                      action={action}
                      isDeciding={decidingId === action.id}
                      onApprove={() => handleDecision(action.id, "approved")}
                      onDeny={() => handleDecision(action.id, "denied")}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* History tab */}
          {!loading && !error && connected && tab === "history" && (
            <>
              {historyLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <History size={32} className="text-muted/20 mx-auto mb-3" />
                  <p className="text-sm text-muted">No actions recorded yet.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-sidebar-border/30">
                    {history.map((action, i) => (
                      <HistoryActionRow key={action.id} action={action} index={i} />
                    ))}
                  </div>
                  {historyTotal > history.length && (
                    <div className="px-6 py-3 border-t border-sidebar-border/50 text-center">
                      <span className="text-[11px] text-muted">
                        Showing {history.length} of {historyTotal} actions
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Policies tab */}
          {!loading && !error && connected && tab === "policies" && (
            <>
              {policiesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <FileText size={32} className="text-muted/20 mx-auto mb-3" />
                  <p className="text-sm text-muted">No policies configured.</p>
                </div>
              ) : (
                <div className="divide-y divide-sidebar-border/30">
                  {policies.map((policy) => (
                    <PolicyCard key={policy.id} policy={policy} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function PendingActionCard({
  action,
  isDeciding,
  onApprove,
  onDeny,
  index,
}: {
  action: ControlAction;
  isDeciding: boolean;
  onApprove: () => void;
  onDeny: () => void;
  index: number;
}) {
  return (
    <div
      className="px-6 py-4 hover:bg-muted-bg/30 transition-colors ghost-fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-md bg-amber-400/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={14} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-accent/10 text-accent">
              {action.action_type}
            </span>
            {action.agent_name && (
              <span className="text-[11px] text-muted truncate">{action.agent_name}</span>
            )}
          </div>
          {action.description && (
            <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3 mb-1.5">
              {action.description}
            </p>
          )}
          {action.details && Object.keys(action.details).length > 0 && (
            <div className="mt-1.5 mb-2 px-3 py-2 bg-muted-bg/50 rounded-md">
              <pre className="text-[11px] text-muted font-mono whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-y-auto">
                {JSON.stringify(action.details, null, 2)}
              </pre>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-muted" title={formatFullTime(action.created_at)}>
              {formatTime(action.created_at)}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onDeny}
                disabled={isDeciding}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
              >
                {isDeciding ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <XCircle size={12} />
                )}
                Deny
              </button>
              <button
                onClick={onApprove}
                disabled={isDeciding}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
              >
                {isDeciding ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryActionRow({ action, index }: { action: ControlAction; index: number }) {
  const style = getStatusStyle(action.status);

  return (
    <div
      className="px-6 py-3 hover:bg-muted-bg/30 transition-colors ghost-fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text}`}
        >
          {style.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm text-foreground/90 font-medium">{action.action_type}</span>
            {action.agent_name && (
              <>
                <span className="text-muted/30">·</span>
                <span className="text-[11px] text-muted truncate">{action.agent_name}</span>
              </>
            )}
          </div>
          {action.description && (
            <p className="text-xs text-muted line-clamp-2 leading-relaxed">{action.description}</p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-muted mt-1">
            <span title={formatFullTime(action.created_at)}>{formatTime(action.created_at)}</span>
            {action.decided_at && (
              <>
                <span className="text-muted/30">·</span>
                <span title={formatFullTime(action.decided_at)}>
                  Decided {formatTime(action.decided_at)}
                </span>
              </>
            )}
            {action.decided_by && (
              <>
                <span className="text-muted/30">·</span>
                <span className="truncate max-w-[120px]">by {action.decided_by}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyCard({ policy }: { policy: ControlPolicy }) {
  return (
    <div className="px-6 py-4 ghost-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={13} className="text-violet-400" />
        <h3 className="text-sm font-medium text-foreground">{policy.name}</h3>
      </div>
      {policy.description && (
        <p className="text-xs text-muted mb-3 leading-relaxed">{policy.description}</p>
      )}
      {policy.rules.length > 0 && (
        <div className="space-y-1.5">
          {policy.rules.map((rule, i) => {
            const effectStyle = getEffectStyle(rule.effect);
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 bg-muted-bg/40 rounded-md"
              >
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${effectStyle.bg} ${effectStyle.text}`}
                >
                  {effectStyle.label}
                </span>
                <span className="text-xs text-foreground/80 font-mono">{rule.action}</span>
                {rule.scope && (
                  <>
                    <span className="text-muted/30">·</span>
                    <span className="text-[11px] text-muted truncate">{rule.scope}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
