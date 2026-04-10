"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X, Shield, Clock, Check, AlertCircle, Activity, FileText,
  GitMerge, GitPullRequest, Eye, Loader2, RefreshCw, Radio,
  ChevronRight, Zap, Brain, CheckCircle2, XCircle,
  LayoutDashboard, Plus, Trash2, Edit2,
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
  agent_id?: string;
}

interface Dashboard {
  window: "24h" | "7d" | "30d";
  bucket: "hour" | "day";
  backend: "postgres" | "file";
  totals: {
    evaluations: number;
    executed: number;
    pending_review: number;
    approved: number;
    denied: number;
  };
  violations_by_policy: Array<{
    policy: string;
    count: number;
    severity_breakdown: Record<string, number>;
  }>;
  violations_by_agent: Array<{
    agent_id: string;
    count: number;
  }>;
  time_series: Array<{
    bucket: string;
    executed: number;
    pending_review: number;
    approved: number;
    denied: number;
  }>;
}

interface Violation {
  action_id: string;
  action: string;
  timestamp: string;
  event: "action_pending_review" | "action_denied" | "action_executed";
  triggered_policy: string | null;
  severity: "critical" | "high" | "medium" | "low" | null;
  reason: string | null;
  risk_score: number | null;
  violation_count: number;
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

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Shield;
  tone?: "emerald" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-400" :
    tone === "amber" ? "text-amber-400" :
    tone === "red" ? "text-red-400" :
    "text-accent";
  return (
    <div className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className={toneClass} />
        <span className="text-[10px] text-muted uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${toneClass}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function TestResultDisplay({ result }: { result: TestResult }) {
  const status = result.status;
  const policy = result.policy_result;
  const actionId = result.action_id || policy?.action_id;

  const toneClass =
    status === "allowed" ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400" :
    status === "blocked" ? "bg-red-400/10 border-red-400/30 text-red-400" :
    status === "pending_review" ? "bg-amber-400/10 border-amber-400/30 text-amber-400" :
    "bg-muted-bg/30 border-sidebar-border text-muted";

  const Icon =
    status === "allowed" ? CheckCircle2 :
    status === "blocked" ? XCircle :
    status === "pending_review" ? Clock :
    AlertCircle;

  return (
    <div className={`rounded px-3 py-2.5 border ${toneClass}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={14} />
        <span className="text-xs font-semibold">
          {status === "pending_review" ? "Pending review" :
           status === "allowed" ? "Allowed" :
           status === "blocked" ? "Blocked" :
           status}
        </span>
      </div>
      {policy?.triggered_policy && (
        <div className="text-[11px] mb-0.5">
          <span className="opacity-60">Policy:</span>{" "}
          <span className="font-mono">{policy.triggered_policy}</span>
        </div>
      )}
      {policy?.severity && (
        <div className="text-[11px] mb-0.5">
          <span className="opacity-60">Severity:</span>{" "}
          <span className="font-medium uppercase">{policy.severity}</span>
        </div>
      )}
      {typeof policy?.risk_score === "number" && (
        <div className="text-[11px] mb-0.5">
          <span className="opacity-60">Risk score:</span>{" "}
          <span>{(policy.risk_score * 100).toFixed(0)}%</span>
        </div>
      )}
      {policy?.reason && (
        <div className="text-[11px] mb-0.5">
          <span className="opacity-60">Reason:</span> {policy.reason}
        </div>
      )}
      {actionId && (
        <div className="text-[10px] opacity-70 font-mono mt-1 break-all">
          action_id: {actionId}
        </div>
      )}
    </div>
  );
}

function TimeSeriesChart({
  data,
  bucket,
}: {
  data: Array<{
    bucket: string;
    executed: number;
    pending_review: number;
    approved: number;
    denied: number;
  }>;
  bucket: "hour" | "day";
}) {
  const max = Math.max(
    ...data.map(d => d.executed + d.pending_review + d.approved + d.denied),
    1
  );
  const formatBucket = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return bucket === "hour"
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };
  return (
    <div className="flex items-end gap-0.5 h-24">
      {data.map((point, i) => {
        const total = point.executed + point.pending_review + point.approved + point.denied;
        const h = (total / max) * 100;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col justify-end min-w-0 group relative"
            title={`${formatBucket(point.bucket)}: ${total} events`}
          >
            <div className="w-full flex flex-col" style={{ height: `${h}%` }}>
              {point.denied > 0 && (
                <div className="w-full bg-red-400/60" style={{ flex: point.denied }} />
              )}
              {point.pending_review > 0 && (
                <div className="w-full bg-amber-400/60" style={{ flex: point.pending_review }} />
              )}
              {point.approved > 0 && (
                <div className="w-full bg-emerald-400/60" style={{ flex: point.approved }} />
              )}
              {point.executed > 0 && (
                <div className="w-full bg-accent/60" style={{ flex: point.executed }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

type Section = "governance" | "approvals" | "activity" | "policies" | "health" | "drafts";

interface MissionControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MissionControl({ isOpen, onClose }: MissionControlProps) {
  const [section, setSection] = useState<Section>("governance");

  // Governance dashboard
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);

  // Policy editor
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);

  // Approvals
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  // Activity stream
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/control/dashboard");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setDashboard(data.dashboard || null);
    } catch {
      setDashboard(null);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const fetchViolations = useCallback(async (agentId: string) => {
    setViolationsLoading(true);
    try {
      const res = await fetch(`/api/control/agents/${encodeURIComponent(agentId)}/violations?limit=50`);
      const data = await res.json();
      setViolations(data.violations || []);
    } catch {
      setViolations([]);
    } finally {
      setViolationsLoading(false);
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
        // Reconnect after 5s — track timer so cleanup can cancel it
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
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
    if (section === "governance" && dashboard === null && !dashboardLoading) fetchDashboard();
    if (section === "policies" && policies.length === 0 && !policiesLoading) fetchPolicies();
    if (section === "drafts" && drafts.length === 0 && !draftsLoading) fetchDrafts();
  }, [section, isOpen, dashboard, dashboardLoading, policies.length, policiesLoading, drafts.length, draftsLoading, fetchDashboard, fetchPolicies, fetchDrafts]);

  // Load violations when an agent is selected from the dashboard
  useEffect(() => {
    if (selectedAgentId) fetchViolations(selectedAgentId);
  }, [selectedAgentId, fetchViolations]);

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

  const handleSavePolicy = async (policy: Policy) => {
    setPolicySaving(true);
    try {
      const isUpdate = Boolean(policy.id);
      const url = isUpdate ? `/api/control/policies/${policy.id}` : "/api/control/policies";
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: policy.name,
          description: policy.description,
          agent_id: policy.agent_id,
          rules: policy.rules || [],
          enabled: policy.enabled ?? true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert(err.error || "Failed to save policy. Check your input and try again.");
        return;
      }
      await fetchPolicies();
      setEditingPolicy(null);
      setCreatingPolicy(false);
    } catch (err) {
      console.error("[MissionControl] Policy save failed:", err);
      window.alert("Could not save policy. Please check your connection and try again.");
    } finally {
      setPolicySaving(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!window.confirm("Delete this policy? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/control/policies/${policyId}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("Failed to delete policy.");
        return;
      }
      await fetchPolicies();
    } catch (err) {
      console.error("[MissionControl] Policy delete failed:", err);
      window.alert("Could not delete policy. Please try again.");
    }
  };

  // --- Derived ---

  const pendingCount = approvals.filter(a => a.status === "pending_approval" || a.status === "pending_review").length;
  const openDrafts = drafts.filter(d => d.status === "draft").length;
  const healthScore = typeof health?.score === "number" ? health.score : null;

  // --- Render ---

  if (!isOpen) return null;

  const sections: { id: Section; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: "governance", label: "Governance", icon: LayoutDashboard },
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

        {/* === GOVERNANCE === */}
        {section === "governance" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium">Governance Dashboard</h3>
                <p className="text-xs text-muted mt-0.5">Overview of actions, policies, and agent behavior</p>
              </div>
              <button
                onClick={fetchDashboard}
                disabled={dashboardLoading}
                className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={14} className={dashboardLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {dashboardLoading && !dashboard ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : !dashboard ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
                  <LayoutDashboard size={28} className="text-accent/30" />
                </div>
                <p className="text-sm font-medium text-foreground/60">Dashboard unavailable</p>
                <p className="text-xs text-center max-w-xs leading-relaxed mt-1">
                  Requires a Novyx API key with Control enabled.
                </p>
              </div>
            ) : (
              <>
                {/* Window / backend indicator */}
                <div className="flex items-center gap-2 mb-3 text-[10px] text-muted">
                  <span>Window: {dashboard.window}</span>
                  <span>&middot;</span>
                  <span>Bucket: {dashboard.bucket}</span>
                  {dashboard.backend === "file" && (
                    <>
                      <span>&middot;</span>
                      <span className="text-amber-400">File mode (limited data)</span>
                    </>
                  )}
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  <StatCard label="Evaluations" value={dashboard.totals.evaluations} icon={Zap} />
                  <StatCard label="Executed" value={dashboard.totals.executed} icon={CheckCircle2} tone="emerald" />
                  <StatCard label="Pending review" value={dashboard.totals.pending_review} icon={Clock} tone="amber" />
                  <StatCard label="Approved" value={dashboard.totals.approved} icon={Check} tone="emerald" />
                  <StatCard label="Denied" value={dashboard.totals.denied} icon={XCircle} tone="red" />
                </div>

                {/* Violations by policy */}
                <div className="bg-card-bg border border-sidebar-border rounded-lg p-4 mb-4">
                  <h4 className="text-xs font-medium text-foreground/80 mb-3">Violations by policy</h4>
                  {dashboard.violations_by_policy.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">No policy violations recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {dashboard.violations_by_policy.slice(0, 10).map((row) => {
                        const max = Math.max(...dashboard.violations_by_policy.map(r => r.count), 1);
                        const pct = (row.count / max) * 100;
                        return (
                          <div key={row.policy} className="flex items-center gap-3 px-2 py-1.5">
                            <span className="text-xs text-foreground/80 w-40 truncate">{row.policy}</span>
                            <div className="flex-1 h-1.5 bg-muted-bg rounded overflow-hidden">
                              <div className="h-full bg-amber-400/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted w-10 text-right">{row.count}</span>
                            <div className="flex gap-1">
                              {Object.entries(row.severity_breakdown).map(([sev, n]) => (
                                <span
                                  key={sev}
                                  className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                                    sev === "critical" ? "bg-red-500/20 text-red-400" :
                                    sev === "high" ? "bg-red-400/15 text-red-400" :
                                    sev === "medium" ? "bg-amber-400/15 text-amber-400" :
                                    "bg-muted-bg text-muted"
                                  }`}
                                  title={`${n} ${sev}`}
                                >
                                  {sev[0].toUpperCase()}{n}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Violations by agent */}
                <div className="bg-card-bg border border-sidebar-border rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-medium text-foreground/80">Violations by agent</h4>
                    <span className="text-[10px] text-muted">Click to drill down</span>
                  </div>
                  {dashboard.violations_by_agent.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">No agent violations recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {dashboard.violations_by_agent.slice(0, 10).map((row) => {
                        const max = Math.max(...dashboard.violations_by_agent.map(r => r.count), 1);
                        const pct = (row.count / max) * 100;
                        return (
                          <button
                            key={row.agent_id}
                            onClick={() => setSelectedAgentId(row.agent_id)}
                            className="w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted-bg/50 transition-colors text-left"
                          >
                            <span className="text-xs text-foreground/80 w-40 truncate font-mono">
                              {row.agent_id}
                            </span>
                            <div className="flex-1 h-1.5 bg-muted-bg rounded overflow-hidden">
                              <div className="h-full bg-red-400/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted w-10 text-right">{row.count}</span>
                            <ChevronRight size={12} className="text-muted" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Per-agent violations drilldown */}
                {selectedAgentId && (
                  <div className="bg-card-bg border border-accent/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-medium text-accent">
                        Violations: <span className="font-mono">{selectedAgentId}</span>
                      </h4>
                      <button
                        onClick={() => { setSelectedAgentId(null); setViolations([]); }}
                        className="text-[10px] text-muted hover:text-foreground"
                      >
                        Close
                      </button>
                    </div>
                    {violationsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 size={16} className="text-accent animate-spin" />
                      </div>
                    ) : violations.length === 0 ? (
                      <p className="text-xs text-muted py-4 text-center">No violations for this agent</p>
                    ) : (
                      <div className="space-y-2">
                        {violations.map((v) => (
                          <div key={v.action_id} className="flex items-start gap-3 px-2 py-2 rounded bg-background/40">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                              v.severity === "critical" ? "bg-red-500/20 text-red-400" :
                              v.severity === "high" ? "bg-red-400/15 text-red-400" :
                              v.severity === "medium" ? "bg-amber-400/15 text-amber-400" :
                              v.severity === "low" ? "bg-muted-bg text-muted" :
                              "bg-muted-bg text-muted"
                            }`}>
                              {v.severity || "—"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-foreground truncate">{v.action}</span>
                                <span className={`text-[10px] px-1 py-0.5 rounded ${
                                  v.event === "action_denied" ? "bg-red-400/15 text-red-400" :
                                  v.event === "action_pending_review" ? "bg-amber-400/15 text-amber-400" :
                                  "bg-muted-bg text-muted"
                                }`}>
                                  {v.event.replace("action_", "")}
                                </span>
                                {v.risk_score !== null && (
                                  <span className="text-[10px] text-muted">
                                    risk {(v.risk_score * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                              {v.reason && (
                                <div className="text-[11px] text-muted mt-0.5 truncate">{v.reason}</div>
                              )}
                              <div className="text-[10px] text-muted mt-1">
                                {v.triggered_policy && <span>{v.triggered_policy} &middot; </span>}
                                {timeAgo(v.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time series */}
                <div className="bg-card-bg border border-sidebar-border rounded-lg p-4">
                  <h4 className="text-xs font-medium text-foreground/80 mb-3">
                    Activity over time ({dashboard.window})
                  </h4>
                  {dashboard.time_series.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">No activity in this window</p>
                  ) : (
                    <TimeSeriesChart data={dashboard.time_series} bucket={dashboard.bucket} />
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCreatingPolicy(true); setEditingPolicy({ id: "", name: "", rules: [], enabled: true }); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
                >
                  <Plus size={12} />
                  New policy
                </button>
                <button onClick={fetchPolicies} disabled={policiesLoading} className="p-1.5 rounded text-muted hover:text-foreground transition-colors">
                  <RefreshCw size={14} className={policiesLoading ? "animate-spin" : ""} />
                </button>
              </div>
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
                        {p.agent_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">
                            agent:{p.agent_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {p.approval_mode && (
                          <span className="text-[10px] text-muted mr-2">{p.approval_mode}</span>
                        )}
                        {p.id && (
                          <>
                            <button
                              onClick={() => { setEditingPolicy(p); setCreatingPolicy(false); }}
                              className="p-1 rounded text-muted hover:text-foreground hover:bg-muted-bg/50 transition-colors"
                              aria-label="Edit policy"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeletePolicy(p.id)}
                              className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              aria-label="Delete policy"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
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

      {/* === POLICY EDITOR MODAL === */}
      {editingPolicy && (
        <PolicyEditor
          key={editingPolicy.id || "new"}
          policy={editingPolicy}
          isNew={creatingPolicy}
          saving={policySaving}
          agentOptions={dashboard?.violations_by_agent.map(a => ({
            id: a.agent_id,
            name: a.agent_id,
          })) || []}
          onSave={handleSavePolicy}
          onClose={() => { setEditingPolicy(null); setCreatingPolicy(false); }}
        />
      )}
    </div>
  );
}

// --- Policy Editor ---

interface PolicyEditorProps {
  policy: Policy;
  isNew: boolean;
  saving: boolean;
  agentOptions: Array<{ id: string; name: string }>;
  onSave: (p: Policy) => void;
  onClose: () => void;
}

interface TestResult {
  status: "allowed" | "blocked" | "pending_review" | string;
  action_id?: string;
  policy_result?: {
    action_id?: string;
    triggered_policy?: string;
    severity?: string;
    reason?: string;
    risk_score?: number;
  };
  [key: string]: unknown;
}

function PolicyEditor({ policy, isNew, saving, agentOptions, onSave, onClose }: PolicyEditorProps) {
  // Parent passes key={policy.id || "new"} so this component remounts per-policy,
  // which means plain useState initialization with the current policy works correctly.
  const [draft, setDraft] = useState<Policy>(policy);
  const [rulesJson, setRulesJson] = useState<string>(
    JSON.stringify(policy.rules || [], null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Test Action panel state
  const [testOpen, setTestOpen] = useState(false);
  const [testAction, setTestAction] = useState("");
  const [testParamsJson, setTestParamsJson] = useState("{}");
  const [testAgentId, setTestAgentId] = useState("");
  const [testParamsError, setTestParamsError] = useState<string | null>(null);
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleTestParamsChange = (value: string) => {
    setTestParamsJson(value);
    if (!value.trim()) {
      setTestParamsError(null);
      return;
    }
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
        setTestParamsError("Params must be a JSON object");
        return;
      }
      setTestParamsError(null);
    } catch (e) {
      setTestParamsError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleTestSubmit = async () => {
    if (!testAction.trim()) {
      setTestError("Action name is required");
      return;
    }
    if (testParamsError) return;

    let params: Record<string, unknown> = {};
    try {
      params = testParamsJson.trim() ? JSON.parse(testParamsJson) : {};
    } catch {
      setTestParamsError("Invalid JSON");
      return;
    }

    setTestSubmitting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/control/actions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: testAction.trim(),
          params,
          agent_id: testAgentId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || `Request failed (${res.status})`);
        return;
      }
      setTestResult(data as TestResult);
    } catch (err) {
      console.error("[PolicyEditor] Test action submit failed:", err);
      setTestError("Network error. Check your connection and try again.");
    } finally {
      setTestSubmitting(false);
    }
  };

  const handleRulesChange = (value: string) => {
    setRulesJson(value);
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        setJsonError("Rules must be an array");
        return;
      }
      setJsonError(null);
      setDraft(d => ({ ...d, rules: parsed }));
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jsonError) return;
    if (!draft.name.trim()) {
      window.alert("Policy name is required");
      return;
    }
    onSave(draft);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-background border border-sidebar-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            <h3 className="text-sm font-medium">
              {isNew ? "Create policy" : `Edit policy: ${policy.name}`}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1">Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="e.g. no-external-api"
              className="w-full px-3 py-2 bg-card-bg border border-sidebar-border rounded text-sm focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Description (optional)</label>
            <input
              type="text"
              value={draft.description || ""}
              onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="What does this policy enforce?"
              className="w-full px-3 py-2 bg-card-bg border border-sidebar-border rounded text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">
              Scope to agent (optional, Pro tier)
            </label>
            <select
              value={draft.agent_id || ""}
              onChange={(e) => setDraft(d => ({ ...d, agent_id: e.target.value || undefined }))}
              className="w-full px-3 py-2 bg-card-bg border border-sidebar-border rounded text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All agents (global policy)</option>
              {agentOptions.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">
              Rules (JSON array)
            </label>
            <textarea
              value={rulesJson}
              onChange={(e) => handleRulesChange(e.target.value)}
              rows={10}
              className={`w-full px-3 py-2 bg-card-bg border rounded text-xs font-mono focus:outline-none ${
                jsonError ? "border-red-400 focus:border-red-400" : "border-sidebar-border focus:border-accent"
              }`}
              placeholder={`[\n  { "action": "http.fetch", "effect": "require_approval", "scope": "external" }\n]`}
            />
            {jsonError && (
              <p className="text-[11px] text-red-400 mt-1">Invalid: {jsonError}</p>
            )}
            <p className="text-[10px] text-muted mt-1">
              Each rule: <code>{"{ action, effect: \"allow\" | \"deny\" | \"require_approval\", scope?, conditions? }"}</code>
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled ?? true}
              onChange={(e) => setDraft(d => ({ ...d, enabled: e.target.checked }))}
              className="rounded"
            />
            Policy enabled
          </label>

          <div className="flex items-start gap-2 px-3 py-2 rounded bg-amber-400/5 border border-amber-400/20">
            <AlertCircle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-400/90 leading-relaxed">
              Policy changes can take up to 60 seconds to propagate across all
              Novyx Core instances. If a newly created policy doesn&apos;t
              fire immediately, wait ~60s before investigating.
            </p>
          </div>

          {/* Test this policy */}
          <div className="border border-sidebar-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTestOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-foreground hover:bg-muted-bg/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Zap size={12} className="text-accent" />
                <span className="font-medium">Test this policy</span>
                <span className="text-muted">— submit a sample action to see what fires</span>
              </span>
              <ChevronRight size={12} className={`text-muted transition-transform ${testOpen ? "rotate-90" : ""}`} />
            </button>

            {testOpen && (
              <div className="px-3 py-3 border-t border-sidebar-border space-y-3 bg-card-bg/40">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Action name</label>
                  <input
                    type="text"
                    value={testAction}
                    onChange={(e) => { setTestAction(e.target.value); setTestError(null); }}
                    placeholder="e.g. send_invoice, http.fetch, write_file"
                    className="w-full px-2.5 py-1.5 bg-background border border-sidebar-border rounded text-xs focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1">Params (JSON object)</label>
                  <textarea
                    value={testParamsJson}
                    onChange={(e) => handleTestParamsChange(e.target.value)}
                    rows={4}
                    placeholder='{ "amount": 50000, "recipient": "vendor@example.com" }'
                    className={`w-full px-2.5 py-1.5 bg-background border rounded text-[11px] font-mono focus:outline-none ${
                      testParamsError ? "border-red-400 focus:border-red-400" : "border-sidebar-border focus:border-accent"
                    }`}
                  />
                  {testParamsError && (
                    <p className="text-[10px] text-red-400 mt-1">Invalid: {testParamsError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-muted mb-1">Agent ID (optional)</label>
                  <input
                    type="text"
                    value={testAgentId}
                    onChange={(e) => setTestAgentId(e.target.value)}
                    list="test-agent-options"
                    placeholder="Leave blank for tenant-wide evaluation"
                    className="w-full px-2.5 py-1.5 bg-background border border-sidebar-border rounded text-xs focus:outline-none focus:border-accent"
                  />
                  {agentOptions.length > 0 && (
                    <datalist id="test-agent-options">
                      {agentOptions.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </datalist>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleTestSubmit}
                  disabled={testSubmitting || !testAction.trim() || Boolean(testParamsError)}
                  className="w-full px-3 py-1.5 rounded text-xs bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {testSubmitting && <Loader2 size={12} className="animate-spin" />}
                  Submit test action
                </button>

                {testError && (
                  <div className="flex items-start gap-2 px-2.5 py-2 rounded bg-red-400/5 border border-red-400/20">
                    <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-400/90">{testError}</p>
                  </div>
                )}

                {testResult && <TestResultDisplay result={testResult} />}

                <div className="flex items-start gap-2 px-2.5 py-1.5 rounded bg-muted-bg/30">
                  <AlertCircle size={11} className="text-muted flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted leading-relaxed">
                    Test actions hit the same audit chain as production submissions
                    and will appear in the dashboard. There is currently no dry-run mode.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-sidebar-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || Boolean(jsonError)}
            className="px-3 py-1.5 rounded text-xs bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {isNew ? "Create policy" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
