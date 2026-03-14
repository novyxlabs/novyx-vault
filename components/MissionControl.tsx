"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Shield, Clock, Check, AlertCircle, Activity, FileText,
  GitMerge, GitPullRequest, Eye, Loader2, RefreshCw, Radio,
  ChevronRight, Zap, Brain, CheckCircle2, XCircle,
} from "lucide-react";

// --- Types ---

interface Approval {
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

interface Policy {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rules?: { action: string; effect: string; scope?: string }[];
  connectors?: string[];
  approval_mode?: string;
}

interface StreamEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface Draft {
  draft_id: string;
  branch_id?: string;
  observation: string;
  tags: string[];
  importance: number;
  status: "draft" | "merged" | "rejected";
  review_summary?: { recommendation: string; reason?: string };
  created_at: string;
}

interface HealthData {
  score?: number;
  status?: string;
  checks?: Record<string, unknown>;
  [key: string]: unknown;
}

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  pending_approval: "text-amber-400",
  pending_review: "text-amber-400",
  approved: "text-emerald-400",
  denied: "text-red-400",
  executed: "text-blue-400",
  failed: "text-red-400",
};

const EVENT_ICONS: Record<string, typeof Brain> = {
  "memory.created": Brain,
  "memory.updated": Brain,
  "memory.deleted": Brain,
  "action.submitted": Zap,
  "action.approved": CheckCircle2,
  "action.denied": XCircle,
  "draft.created": GitPullRequest,
  "draft.merged": GitMerge,
  "draft.rejected": XCircle,
};

// --- Sections ---

type Section = "approvals" | "activity" | "policies" | "health" | "drafts";

interface MissionControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MissionControl({ isOpen, onClose }: MissionControlProps) {
  const [section, setSection] = useState<Section>("approvals");

  // Approvals
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Activity stream
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Policies
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  // Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Drafts
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionId, setDraftActionId] = useState<string | null>(null);

  // --- Fetch functions ---

  const fetchApprovals = useCallback(async () => {
    setApprovalsLoading(true);
    try {
      const res = await fetch("/api/control/approvals?limit=50");
      const data = await res.json();
      setApprovals(data.approvals || data.actions || []);
    } catch {
      setApprovals([]);
    } finally {
      setApprovalsLoading(false);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      const res = await fetch("/api/control/policies");
      const data = await res.json();
      setPolicies(data.policies || []);
    } catch {
      setPolicies([]);
    } finally {
      setPoliciesLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/control/health");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/memory/drafts?status=draft&limit=50");
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  // --- SSE stream ---

  const connectStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource("/api/control/stream");
      eventSourceRef.current = es;

      es.onopen = () => {
        // Only mark connected after a short delay to avoid false positives
        // when the stream opens but immediately errors
        setTimeout(() => {
          if (eventSourceRef.current === es && es.readyState === EventSource.OPEN) {
            setStreamConnected(true);
          }
        }, 500);
      };

      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as StreamEvent;
          setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        setStreamConnected(false);
        es.close();
        eventSourceRef.current = null;
        // Reconnect after 5s
        setTimeout(() => {
          if (isOpen) connectStream();
        }, 5000);
      };
    } catch {
      setStreamConnected(false);
    }
  }, [isOpen]);

  // --- Effects ---

  useEffect(() => {
    if (!isOpen) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStreamConnected(false);
      return;
    }
    fetchApprovals();
    fetchHealth();
    connectStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isOpen, fetchApprovals, fetchHealth, connectStream]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Lazy-load sections
  useEffect(() => {
    if (!isOpen) return;
    if (section === "policies" && policies.length === 0 && !policiesLoading) fetchPolicies();
    if (section === "drafts" && drafts.length === 0 && !draftsLoading) fetchDrafts();
  }, [section, isOpen, policies.length, policiesLoading, drafts.length, draftsLoading, fetchPolicies, fetchDrafts]);

  // --- Actions ---

  const handleDecision = async (id: string, decision: "approved" | "denied") => {
    setDecidingId(id);
    try {
      await fetch(`/api/control/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: decision } : a));
    } catch { /* silent */ }
    finally { setDecidingId(null); }
  };

  const handleMergeDraft = async (draftId: string) => {
    setDraftActionId(draftId);
    try {
      await fetch(`/api/memory/drafts/${draftId}/merge`, { method: "POST" });
      setDrafts(prev => prev.map(d => d.draft_id === draftId ? { ...d, status: "merged" as const } : d));
    } catch { /* silent */ }
    finally { setDraftActionId(null); }
  };

  const handleRejectDraft = async (draftId: string) => {
    setDraftActionId(draftId);
    try {
      await fetch(`/api/memory/drafts/${draftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setDrafts(prev => prev.map(d => d.draft_id === draftId ? { ...d, status: "rejected" as const } : d));
    } catch { /* silent */ }
    finally { setDraftActionId(null); }
  };

  // --- Derived ---

  const pendingCount = approvals.filter(a => a.status === "pending_approval" || a.status === "pending_review").length;
  const openDrafts = drafts.filter(d => d.status === "draft").length;
  const healthScore = typeof health?.score === "number" ? health.score : null;

  // --- Render ---

  if (!isOpen) return null;

  const sections: { id: Section; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: "approvals", label: "Approvals", icon: Shield, badge: pendingCount },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "drafts", label: "Drafts", icon: GitPullRequest, badge: openDrafts },
    { id: "policies", label: "Policies", icon: FileText },
    { id: "health", label: "Health", icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Mission Control">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-accent" />
          <span className="text-sm font-medium">Mission Control</span>
          {/* Status indicators */}
          <div className="flex items-center gap-2 ml-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${streamConnected ? "bg-emerald-400 animate-pulse" : "bg-muted"}`} />
              <span className="text-[10px] text-muted">{streamConnected ? "Live" : "Connecting"}</span>
            </div>
            {healthScore !== null && (
              <div className="flex items-center gap-1.5 ml-2">
                <div className={`w-1.5 h-1.5 rounded-full ${healthScore >= 0.8 ? "bg-emerald-400" : healthScore >= 0.5 ? "bg-amber-400" : "bg-red-400"}`} />
                <span className="text-[10px] text-muted">{Math.round(healthScore * 100)}</span>
              </div>
            )}
            {pendingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 font-medium ml-2">
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded text-muted hover:text-foreground transition-colors" aria-label="Close Mission Control">
          <X size={18} />
        </button>
      </div>

      {/* Section tabs */}
      <div className="px-4 py-2 border-b border-sidebar-border flex gap-1 overflow-x-auto scrollbar-none">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
              section === s.id ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-muted-bg"
            }`}
          >
            <s.icon size={14} />
            {s.label}
            {s.badge !== undefined && s.badge > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent/20 text-accent font-medium leading-none">
                {s.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* === APPROVALS === */}
        {section === "approvals" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">Approval Queue</h3>
                <p className="text-xs text-muted mt-0.5">
                  {pendingCount > 0 ? `${pendingCount} action${pendingCount === 1 ? "" : "s"} awaiting review` : "Agent actions requiring approval"}
                </p>
              </div>
              <button onClick={fetchApprovals} disabled={approvalsLoading} className="p-1.5 rounded text-muted hover:text-foreground transition-colors">
                <RefreshCw size={14} className={approvalsLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {approvalsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : approvals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <div className="w-16 h-16 rounded-2xl bg-emerald-400/5 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} className="text-emerald-400/30" />
                </div>
                <p className="text-sm font-medium text-foreground/60">All clear</p>
                <p className="text-xs text-center max-w-xs leading-relaxed mt-1">
                  No actions pending approval. When agents request governed actions, they&apos;ll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {approvals.map(a => {
                  const isPending = a.status === "pending_approval" || a.status === "pending_review";
                  const color = STATUS_COLORS[a.status] || "text-muted";
                  return (
                    <div key={a.id} className="group bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <Zap size={14} className={`mt-0.5 shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{a.action_type}</span>
                            {a.agent_name && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted-bg text-muted">{a.agent_name}</span>}
                          </div>
                          {a.description && <p className="text-xs text-muted mt-1 leading-relaxed">{a.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted">{timeAgo(a.created_at)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isPending ? "bg-amber-400/15 text-amber-400" :
                              a.status === "approved" ? "bg-emerald-400/15 text-emerald-400" :
                              "bg-red-400/15 text-red-400"
                            }`}>
                              {a.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDecision(a.id, "approved")}
                              disabled={decidingId === a.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                              {decidingId === a.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecision(a.id, "denied")}
                              disabled={decidingId === a.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-400/15 text-red-400 rounded-md text-xs hover:bg-red-400/25 transition-colors disabled:opacity-50"
                            >
                              <X size={12} /> Deny
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === ACTIVITY FEED === */}
        {section === "activity" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Live Activity</h3>
                <div className="flex items-center gap-1.5">
                  <Radio size={10} className={streamConnected ? "text-emerald-400 animate-pulse" : "text-muted"} />
                  <span className="text-[10px] text-muted">{streamConnected ? "Connected" : "Reconnecting..."}</span>
                </div>
              </div>
              {events.length > 0 && (
                <button onClick={() => setEvents([])} className="text-[10px] text-muted hover:text-foreground transition-colors">
                  Clear
                </button>
              )}
            </div>

            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
                  <Activity size={28} className="text-accent/30" />
                </div>
                <p className="text-sm font-medium text-foreground/60">Listening for events</p>
                <p className="text-xs text-center max-w-xs leading-relaxed mt-1">
                  Memory writes, action decisions, and draft changes will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {events.map((event, i) => {
                  const Icon = EVENT_ICONS[event.type] || Activity;
                  return (
                    <div key={event.id || i} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-card-bg transition-colors">
                      <Icon size={14} className="text-accent/60 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{event.type.replace(/\./g, " ")}</span>
                          <span className="text-[10px] text-muted">{timeAgo(event.timestamp)}</span>
                        </div>
                        {(event.data as Record<string, string>).observation && (
                          <p className="text-xs text-muted mt-0.5 truncate">{String((event.data as Record<string, string>).observation)}</p>
                        )}
                        {(event.data as Record<string, string>).action_type && (
                          <p className="text-xs text-muted mt-0.5">
                            {String((event.data as Record<string, string>).action_type)}
                            {(event.data as Record<string, string>).agent_name ? ` by ${(event.data as Record<string, string>).agent_name}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === DRAFTS === */}
        {section === "drafts" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">Open Drafts</h3>
                <p className="text-xs text-muted mt-0.5">
                  {openDrafts > 0 ? `${openDrafts} draft${openDrafts === 1 ? "" : "s"} pending review` : "Memory drafts from agents"}
                </p>
              </div>
              <button onClick={fetchDrafts} disabled={draftsLoading} className="p-1.5 rounded text-muted hover:text-foreground transition-colors">
                <RefreshCw size={14} className={draftsLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {draftsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
                  <GitPullRequest size={28} className="text-accent/30" />
                </div>
                <p className="text-sm font-medium text-foreground/60">No open drafts</p>
                <p className="text-xs text-center max-w-xs leading-relaxed mt-1">
                  When agents propose memory changes, drafts appear here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {drafts.map(d => {
                  const actionable = d.status === "draft";
                  const rec = d.review_summary?.recommendation;
                  return (
                    <div key={d.draft_id} className="group bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">{d.observation}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-muted">{timeAgo(d.created_at)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              d.status === "draft" ? "bg-amber-400/15 text-amber-400" :
                              d.status === "merged" ? "bg-emerald-400/15 text-emerald-400" :
                              "bg-red-400/15 text-red-400"
                            }`}>
                              {d.status === "draft" ? "Open" : d.status}
                            </span>
                            {rec && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                rec === "merge" ? "bg-emerald-400/15 text-emerald-400" :
                                rec === "review" ? "bg-amber-400/15 text-amber-400" :
                                "bg-muted-bg text-muted"
                              }`}>
                                {rec}
                              </span>
                            )}
                            {d.branch_id && (
                              <span className="text-[10px] text-accent/60 font-mono">{d.branch_id.slice(0, 8)}</span>
                            )}
                          </div>
                        </div>
                        {actionable && (
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleMergeDraft(d.draft_id)}
                              disabled={draftActionId === d.draft_id}
                              className="p-1.5 rounded text-muted hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                              title="Merge"
                            >
                              {draftActionId === d.draft_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button
                              onClick={() => handleRejectDraft(d.draft_id)}
                              disabled={draftActionId === d.draft_id}
                              className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                              title="Reject"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === POLICIES === */}
        {section === "policies" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Policies</h3>
              <button onClick={fetchPolicies} disabled={policiesLoading} className="p-1.5 rounded text-muted hover:text-foreground transition-colors">
                <RefreshCw size={14} className={policiesLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {policiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
                  <FileText size={28} className="text-accent/30" />
                </div>
                <p className="text-sm font-medium text-foreground/60">No policies configured</p>
                <p className="text-xs text-center max-w-xs leading-relaxed mt-1">
                  Sentinel policies define what agents can do — which actions are allowed, denied, or require approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {policies.map((p, i) => (
                  <div key={p.id || p.name || i} className="bg-card-bg border border-sidebar-border rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-accent" />
                        <span className="text-sm font-medium">{p.name}</span>
                        {p.enabled !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.enabled ? "bg-emerald-400/15 text-emerald-400" : "bg-muted-bg text-muted"}`}>
                            {p.enabled ? "Active" : "Disabled"}
                          </span>
                        )}
                      </div>
                      {p.approval_mode && (
                        <span className="text-[10px] text-muted">{p.approval_mode}</span>
                      )}
                    </div>
                    {p.description && <p className="text-xs text-muted mb-2">{p.description}</p>}
                    {p.rules && p.rules.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {p.rules.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              r.effect === "allow" ? "bg-emerald-400/15 text-emerald-400" :
                              r.effect === "deny" ? "bg-red-400/15 text-red-400" :
                              "bg-amber-400/15 text-amber-400"
                            }`}>
                              {r.effect}
                            </span>
                            <span className="text-foreground">{r.action}</span>
                            {r.scope && <span className="text-muted">({r.scope})</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {p.connectors && p.connectors.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {p.connectors.map(c => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-muted-bg text-muted">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === HEALTH === */}
        {section === "health" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Memory Health</h3>
              <button onClick={fetchHealth} disabled={healthLoading} className="p-1.5 rounded text-muted hover:text-foreground transition-colors">
                <RefreshCw size={14} className={healthLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {healthLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : !health ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <AlertCircle size={32} className="text-red-400/40 mb-3" />
                <p className="text-sm">Failed to load health data</p>
                <button onClick={fetchHealth} className="text-xs text-accent hover:underline mt-2">Try again</button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score ring */}
                {healthScore !== null && (
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--sidebar-border)" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="50" fill="none"
                          stroke={healthScore >= 0.8 ? "#22c55e" : healthScore >= 0.5 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${healthScore * 314} 314`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">{Math.round(healthScore * 100)}</span>
                        <span className="text-[10px] text-muted">health score</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Health details */}
                {health.status && (
                  <div className="bg-card-bg border border-sidebar-border rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted uppercase tracking-wide">Status</span>
                    </div>
                    <span className={`text-sm font-medium ${
                      health.status === "healthy" ? "text-emerald-400" :
                      health.status === "degraded" ? "text-amber-400" :
                      "text-red-400"
                    }`}>
                      {String(health.status).charAt(0).toUpperCase() + String(health.status).slice(1)}
                    </span>
                  </div>
                )}

                {health.checks && typeof health.checks === "object" && (
                  <div className="bg-card-bg border border-sidebar-border rounded-lg px-4 py-3">
                    <div className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Checks</div>
                    <div className="space-y-2">
                      {Object.entries(health.checks).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-muted">{key.replace(/_/g, " ")}</span>
                          <span className={`font-medium ${
                            val === true || val === "pass" ? "text-emerald-400" :
                            val === false || val === "fail" ? "text-red-400" :
                            "text-foreground"
                          }`}>
                            {typeof val === "boolean" ? (val ? "Pass" : "Fail") : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
