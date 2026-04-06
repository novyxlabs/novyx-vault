"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, Brain, Trash2, Loader2, Sparkles, Clock, Zap, Share2, CalendarDays, History, Shield, Lock, Check, BookOpen, GitPullRequest, RotateCcw } from "lucide-react";
import MemoryGraph from "./MemoryGraph";
import DraftReview from "./DraftReview";

interface Memory {
  uuid: string;
  observation: string;
  tags: string[];
  importance: number;
  confidence: number;
  created_at: string;
}

interface Insight {
  uuid: string;
  observation: string;
  tags: string[];
  importance: number;
  created_at: string;
}

interface ContextNow {
  recent: Memory[];
  recentCount: number;
  upcoming: Memory[];
  upcomingCount: number;
  lastSessionAt: string | null;
}

interface KGNode {
  id: string;
  name: string;
  type?: string;
  tripleCount: number;
}

interface KGEdge {
  source: string;
  target: string;
  predicate: string;
  confidence: number;
}

interface MemoryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "memories" | "learned" | "review" | "timeline" | "insights" | "context" | "graph" | "replay" | "audit";

interface ReplayEntry {
  timestamp: string;
  operation: string;
  memory_id?: string;
  observation_preview?: string;
  importance?: number;
}

interface DriftAnalysis {
  memoryCountFrom: number;
  memoryCountTo: number;
  memoryCountDelta: number;
  avgImportanceFrom: number;
  avgImportanceTo: number;
  avgImportanceDelta: number;
  tagShifts: { tag: string; countFrom: number; countTo: number; delta: number }[];
  topNewTopics: string[];
  topLostTopics: string[];
}

interface AuditEntry {
  timestamp: string;
  operation: string;
  artifact_id?: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SOURCE_STYLES: Record<string, { label: string; className: string }> = {
  vault: { label: "Vault", className: "bg-accent/10 text-accent/70" },
  mcp: { label: "MCP", className: "bg-blue-400/10 text-blue-400/70" },
  api: { label: "API", className: "bg-emerald-400/10 text-emerald-400/70" },
  capture: { label: "Capture", className: "bg-amber-400/10 text-amber-400/70" },
};

function getSource(tags: string[]): { label: string; className: string } | null {
  for (const tag of tags) {
    if (tag.startsWith("source:")) {
      const key = tag.slice(7);
      return SOURCE_STYLES[key] || { label: key, className: "bg-muted-bg text-muted" };
    }
  }
  return null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function groupByDay(memories: Memory[]): { date: string; memories: Memory[] }[] {
  const groups: Record<string, Memory[]> = {};
  for (const mem of memories) {
    const key = new Date(mem.created_at).toLocaleDateString("en-US");
    if (!groups[key]) groups[key] = [];
    groups[key].push(mem);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([, mems]) => ({
      date: formatDate(mems[0].created_at),
      memories: mems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    }));
}

function importanceLevel(importance: number): { label: string; color: string } {
  if (importance >= 0.7) return { label: "high", color: "bg-amber-400" };
  if (importance >= 0.4) return { label: "med", color: "bg-accent" };
  return { label: "low", color: "bg-muted" };
}

const LEARNED_WINDOW_MS = 48 * 60 * 60 * 1000;
const DISMISSED_KEY = "noctivault-learned-dismissed";

const SOURCE_GROUP_LABELS: Record<string, string> = {
  vault: "Chat",
  mcp: "MCP",
  api: "API",
};

function getSourceKey(tags: string[]): string {
  for (const tag of tags) {
    if (tag.startsWith("source:")) return tag.slice(7);
  }
  return "other";
}

function groupBySource(memories: Memory[]): { source: string; label: string; memories: Memory[] }[] {
  const groups: Record<string, Memory[]> = {};
  for (const mem of memories) {
    const key = getSourceKey(mem.tags);
    if (!groups[key]) groups[key] = [];
    groups[key].push(mem);
  }
  const order = ["vault", "mcp", "api"];
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([key, mems]) => ({
      source: key,
      label: SOURCE_GROUP_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1),
      memories: mems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    }));
}

function loadDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const entries: { id: string; at: number }[] = JSON.parse(raw);
    const cutoff = Date.now() - LEARNED_WINDOW_MS;
    const valid = entries.filter(e => e.at > cutoff);
    if (valid.length !== entries.length) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid));
    }
    return new Set(valid.map(e => e.id));
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>) {
  const entries = Array.from(ids).map(id => ({ id, at: Date.now() }));
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(entries));
}

export default function MemoryDashboard({ isOpen, onClose }: MemoryDashboardProps) {
  const [tab, setTab] = useState<Tab>("memories");

  // Memories state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Usage stats & feature gating
  const [usage, setUsage] = useState<Record<string, unknown> | null>(null);
  const [gating, setGating] = useState<{
    tier: string;
    features: { graph: boolean; cortex: boolean; replay: boolean; insights: boolean; drift: boolean };
    usage: { memories_count?: number; memories_limit?: number };
  } | null>(null);

  // Insights state
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [isRunningCortex, setIsRunningCortex] = useState(false);
  const [cortexResult, setCortexResult] = useState<string | null>(null);

  // Context state
  const [context, setContext] = useState<ContextNow | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Graph state
  const [graphNodes, setGraphNodes] = useState<KGNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<KGEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);

  // Timeline state
  const [timelineMemories, setTimelineMemories] = useState<Memory[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Track whether tabs have been fetched (prevents infinite re-fetch loops)
  const [insightsFetched, setInsightsFetched] = useState(false);
  const [contextFetched, setContextFetched] = useState(false);
  const [graphFetched, setGraphFetched] = useState(false);
  const [timelineFetched, setTimelineFetched] = useState(false);
  const [replayFetched, setReplayFetched] = useState(false);
  const [auditFetched, setAuditFetched] = useState(false);

  // Replay state
  const [replayEntries, setReplayEntries] = useState<ReplayEntry[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);
  const [drift, setDrift] = useState<DriftAnalysis | null>(null);
  const [driftLoading, setDriftLoading] = useState(false);

  // Audit state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Rollback state
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [rollbackPreview, setRollbackPreview] = useState<Record<string, unknown> | null>(null);
  const [rollbackPreviewLoading, setRollbackPreviewLoading] = useState(false);
  const [rollbackExecuting, setRollbackExecuting] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<Record<string, unknown> | null>(null);

  // Learned tab state
  const [learnedMemories, setLearnedMemories] = useState<Memory[]>([]);
  const [learnedLoading, setLearnedLoading] = useState(false);
  const [learnedFetched, setLearnedFetched] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [forgettingLearnedId, setForgettingLearnedId] = useState<string | null>(null);

  const fetchMemories = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query?.trim()) params.set("q", query.trim());
      params.set("limit", "50");
      const res = await fetch(`/api/memory?${params}`);
      const data = await res.json();
      setMemories(data.memories || []);
      setTotal(data.total || 0);
    } catch {
      setMemories([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/memory/insights");
      const data = await res.json();
      setInsights(data.insights || []);
    } catch {
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const fetchContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const res = await fetch("/api/memory/context");
      const data = await res.json();
      setContext(data);
    } catch {
      setContext(null);
    } finally {
      setContextLoading(false);
    }
  }, []);

  const fetchGraph = useCallback(async () => {
    setGraphLoading(true);
    try {
      const res = await fetch("/api/memory/graph");
      const data = await res.json();
      setGraphNodes(data.nodes || []);
      setGraphEdges(data.edges || []);
    } catch {
      setGraphNodes([]);
      setGraphEdges([]);
    } finally {
      setGraphLoading(false);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await fetch("/api/memory?limit=200");
      const data = await res.json();
      setTimelineMemories(data.memories || []);
    } catch {
      setTimelineMemories([]);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const fetchReplay = useCallback(async () => {
    setReplayLoading(true);
    setDriftLoading(true);
    try {
      const res = await fetch("/api/memory/replay?limit=100");
      const data = await res.json();
      setReplayEntries(data.entries || []);
    } catch {
      setReplayEntries([]);
    } finally {
      setReplayLoading(false);
    }
    // Fetch drift: last 7 days
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const params = new URLSearchParams({
        type: "drift",
        from: weekAgo.toISOString(),
        to: now.toISOString(),
      });
      const res = await fetch(`/api/memory/replay?${params}`);
      const data = await res.json();
      setDrift(data.drift || null);
    } catch {
      setDrift(null);
    } finally {
      setDriftLoading(false);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/memory/audit?limit=50");
      const data = await res.json();
      setAuditEntries(data.entries || []);
    } catch {
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const handleRollbackPreview = useCallback(async (timestamp: string) => {
    setRollbackTarget(timestamp);
    setRollbackPreview(null);
    setRollbackResult(null);
    setRollbackPreviewLoading(true);
    try {
      const res = await fetch(`/api/memory/rollback?target=${encodeURIComponent(timestamp)}`);
      if (res.ok) {
        setRollbackPreview(await res.json());
      }
    } catch { /* silent */ }
    setRollbackPreviewLoading(false);
  }, []);

  const handleRollbackExecute = useCallback(async () => {
    if (!rollbackTarget) return;
    setRollbackExecuting(true);
    try {
      const res = await fetch("/api/memory/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: rollbackTarget }),
      });
      if (res.ok) {
        const result = await res.json();
        setRollbackResult(result);
        // Refresh replay entries after rollback
        setReplayFetched(false);
      }
    } catch { /* silent */ }
    setRollbackExecuting(false);
  }, [rollbackTarget]);

  const handleRollbackCancel = useCallback(() => {
    setRollbackTarget(null);
    setRollbackPreview(null);
    setRollbackResult(null);
  }, []);

  // Lightweight instrumentation for Learned tab usage
  const trackLearned = useCallback((action: string, props?: Record<string, string | number>) => {
    try {
      const plausible = (window as unknown as { plausible?: (event: string, opts?: { props: Record<string, string | number> }) => void }).plausible;
      if (plausible) plausible("Learned", { props: { action, ...props } });
    } catch { /* silent */ }
  }, []);

  const fetchLearned = useCallback(async () => {
    setLearnedLoading(true);
    try {
      const res = await fetch("/api/memory?limit=200");
      const data = await res.json();
      const cutoff = Date.now() - LEARNED_WINDOW_MS;
      const recent = (data.memories || []).filter(
        (m: Memory) => new Date(m.created_at).getTime() > cutoff
      );
      setLearnedMemories(recent);
      if (recent.length > 0) {
        const sourceCounts: Record<string, number> = {};
        for (const m of recent) { const k = getSourceKey(m.tags); sourceCounts[k] = (sourceCounts[k] || 0) + 1; }
        trackLearned("shown", { count: recent.length, ...sourceCounts });
      }
    } catch {
      setLearnedMemories([]);
    } finally {
      setLearnedLoading(false);
    }
  }, []);

  const handleKeep = useCallback((id: string) => {
    const mem = learnedMemories.find(m => m.uuid === id);
    trackLearned("keep", { source: mem ? getSourceKey(mem.tags) : "unknown" });
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
  }, [learnedMemories, trackLearned]);

  const handleKeepAll = useCallback(() => {
    const active = learnedMemories.filter(m => !dismissedIds.has(m.uuid));
    trackLearned("keep_all", { count: active.length });
    const activeIds = active.map(m => m.uuid);
    setDismissedIds(prev => {
      const next = new Set(prev);
      activeIds.forEach(id => next.add(id));
      saveDismissedIds(next);
      return next;
    });
  }, [learnedMemories, dismissedIds, trackLearned]);

  const handleForgetLearned = useCallback(async (id: string) => {
    const mem = learnedMemories.find(m => m.uuid === id);
    trackLearned("forget", { source: mem ? getSourceKey(mem.tags) : "unknown" });
    setForgettingLearnedId(id);
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setLearnedMemories(prev => prev.filter(m => m.uuid !== id));
        setMemories(prev => prev.filter(m => m.uuid !== id));
        setTotal(prev => prev - 1);
      }
    } finally {
      setForgettingLearnedId(null);
    }
  }, [learnedMemories, trackLearned]);

  const learnedCount = learnedMemories.filter(m => !dismissedIds.has(m.uuid)).length;

  const handleRunCortex = async () => {
    setIsRunningCortex(true);
    setCortexResult(null);
    try {
      const res = await fetch("/api/memory/insights", { method: "POST" });
      const data = await res.json();
      if (data.insights_generated !== undefined) {
        setCortexResult(
          `Consolidated ${data.consolidated}, boosted ${data.boosted}, decayed ${data.decayed}, ${data.insights_generated} new insights`
        );
        fetchInsights();
      } else {
        setCortexResult("Cortex run complete");
      }
    } catch {
      setCortexResult("Failed to run Cortex");
    } finally {
      setIsRunningCortex(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setTab("memories");
      setCortexResult(null);
      setInsightsFetched(false);
      setContextFetched(false);
      setGraphFetched(false);
      setTimelineFetched(false);
      setReplayFetched(false);
      setAuditFetched(false);
      setLearnedFetched(false);
      setDismissedIds(loadDismissedIds());
      fetchLearned();
      fetchMemories();
      fetch("/api/memory/usage").then(r => r.json()).then(d => {
        setUsage(d.usage || null);
        if (d.gating) setGating(d.gating);
      }).catch(() => {});
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen, fetchMemories]);

  useEffect(() => {
    if (!isOpen) return;
    if (tab === "insights" && !insightsFetched && !insightsLoading && !isTabLocked("insights")) {
      setInsightsFetched(true);
      fetchInsights();
    }
    if (tab === "context" && !contextFetched && !contextLoading) {
      setContextFetched(true);
      fetchContext();
    }
    if (tab === "graph" && !graphFetched && !graphLoading && !isTabLocked("graph")) {
      setGraphFetched(true);
      fetchGraph();
    }
    if (tab === "timeline" && !timelineFetched && !timelineLoading) {
      setTimelineFetched(true);
      fetchTimeline();
    }
    if (tab === "replay" && !replayFetched && !replayLoading && !isTabLocked("replay")) {
      setReplayFetched(true);
      fetchReplay();
    }
    if (tab === "audit" && !auditFetched && !auditLoading) {
      setAuditFetched(true);
      fetchAudit();
    }
    if (tab === "learned" && !learnedFetched && !learnedLoading) {
      setLearnedFetched(true);
      setDismissedIds(loadDismissedIds());
      fetchLearned();
    }
  }, [tab, isOpen, insightsFetched, insightsLoading, contextFetched, contextLoading, graphFetched, graphLoading, timelineFetched, timelineLoading, replayFetched, replayLoading, auditFetched, auditLoading, learnedFetched, learnedLoading, fetchInsights, fetchContext, fetchGraph, fetchTimeline, fetchReplay, fetchAudit, fetchLearned]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMemories(value);
    }, 300);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.uuid !== id));
        setTotal((prev) => prev - 1);
      }
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isTabLocked = (tabId: Tab): boolean => {
    if (!gating) return false; // No gating data = desktop mode or loading, show all
    const { features } = gating;
    if (tabId === "insights") return !features.insights;
    if (tabId === "graph") return !features.graph;
    if (tabId === "replay") return !features.replay;
    return false;
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "memories", label: "Memories", icon: <Brain size={14} /> },
    { id: "learned", label: "Learned", icon: <BookOpen size={14} /> },
    { id: "review", label: "Review", icon: <GitPullRequest size={14} /> },
    { id: "timeline", label: "Timeline", icon: <CalendarDays size={14} /> },
    { id: "insights", label: "Insights", icon: <Sparkles size={14} /> },
    { id: "context", label: "Right Now", icon: <Clock size={14} /> },
    { id: "graph", label: "Graph", icon: <Share2 size={14} /> },
    { id: "replay", label: "Replay", icon: <History size={14} /> },
    { id: "audit", label: "Audit", icon: <Shield size={14} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Memory Dashboard"
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-accent" />
          <span className="text-sm font-medium">Memory</span>
          {total > 0 && (
            <span className="text-xs text-muted bg-muted-bg px-2 py-0.5 rounded-full">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {usage && (
            <div className="flex items-center gap-3 text-[10px] text-muted">
              {typeof usage.memories_count === "number" && (
                <span>{(usage.memories_count as number).toLocaleString()} memories</span>
              )}
              {typeof usage.api_calls_used === "number" && typeof usage.api_calls_limit === "number" && (
                <span>{(usage.api_calls_used as number).toLocaleString()}/{(usage.api_calls_limit as number).toLocaleString()} API calls</span>
              )}
              {(gating?.tier || typeof usage.plan === "string") && (
                <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent capitalize">{gating?.tier || (usage.plan as string)}</span>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-sidebar-border flex gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((t) => {
          const locked = isTabLocked(t.id);
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                tab === t.id
                  ? "bg-accent/15 text-accent"
                  : locked
                    ? "text-muted/50 hover:text-muted hover:bg-muted-bg"
                    : "text-muted hover:text-foreground hover:bg-muted-bg"
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === "learned" && learnedCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-accent/20 text-accent font-medium leading-none">
                  {learnedCount}
                </span>
              )}
              {locked && <Lock size={10} className="text-muted/40" />}
            </button>
          );
        })}
      </div>

      {/* Search (memories tab only) */}
      {tab === "memories" && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="relative max-w-xl mx-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search memories semantically..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-card-bg border border-sidebar-border rounded-lg py-2 pl-9 pr-3 text-sm text-foreground placeholder-muted outline-none focus:border-accent/50"
            />
          </div>
        </div>
      )}

      {/* Usage nudge */}
      {tab === "memories" && gating && gating.usage.memories_limit && gating.usage.memories_count !== undefined && (
        (() => {
          const count = gating.usage.memories_count!;
          const limit = gating.usage.memories_limit!;
          const pct = Math.min((count / limit) * 100, 100);
          if (pct < 70) return null;
          return (
            <div className="mx-4 mt-3 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-accent">
                  {count.toLocaleString()} / {limit.toLocaleString()} memories used
                </p>
                {gating.tier !== "pro" && gating.tier !== "enterprise" && (
                  <a
                    href="https://novyx.ai/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-accent hover:underline"
                  >
                    Upgrade →
                  </a>
                )}
              </div>
              <div className="w-full h-1.5 bg-sidebar-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-400" : "bg-accent"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()
      )}

      {/* Content */}
      <div className={`flex-1 ${tab === "graph" ? "overflow-hidden" : "overflow-y-auto p-4"}`}>
        {/* === MEMORIES TAB === */}
        {tab === "memories" && (
          <>
            {isLoading && memories.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted">
                <Brain size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">
                  {searchQuery ? "No memories match your search." : "No memories yet."}
                </p>
                {!searchQuery && (
                  <p className="text-xs mt-1">Chat with the AI to start building memory.</p>
                )}
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-2">
                {memories.map((mem) => {
                  const imp = importanceLevel(mem.importance);
                  return (
                    <div
                      key={mem.uuid}
                      className="group bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${imp.color}`} title={`Importance: ${imp.label}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">{mem.observation}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-muted">{timeAgo(mem.created_at)}</span>
                            {(() => {
                              const source = getSource(mem.tags);
                              return source ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${source.className}`}>
                                  {source.label}
                                </span>
                              ) : null;
                            })()}
                            {mem.tags.filter((t: string) => !t.startsWith("user:") && !t.startsWith("source:")).length > 0 && (
                              <div className="flex gap-1">
                                {mem.tags.filter((t: string) => !t.startsWith("user:") && !t.startsWith("source:")).slice(0, 3).map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent/70"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(mem.uuid)}
                          disabled={deletingId === mem.uuid}
                          className="p-1.5 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
                          title="Delete memory"
                        >
                          {deletingId === mem.uuid ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === LEARNED TAB === */}
        {tab === "learned" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">See what your AI learned</h3>
                <p className="text-xs text-muted mt-0.5">Recent memories from the last 48 hours</p>
              </div>
              {learnedCount > 0 && (
                <button
                  onClick={handleKeepAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/25 transition-colors"
                >
                  <Check size={12} />
                  Looks Good
                </button>
              )}
            </div>

            {learnedLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : learnedCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <BookOpen size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">All caught up!</p>
                <p className="text-xs mt-1">New memories will appear here as your AI learns.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupBySource(learnedMemories.filter(m => !dismissedIds.has(m.uuid))).map((group) => (
                  <div key={group.source}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-muted uppercase tracking-wide">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-muted/60">{group.memories.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.memories.map((mem) => {
                        const imp = importanceLevel(mem.importance);
                        return (
                          <div
                            key={mem.uuid}
                            className="group bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${imp.color}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-foreground leading-relaxed">{mem.observation}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-xs text-muted">{timeAgo(mem.created_at)}</span>
                                  {mem.tags
                                    .filter((t: string) => !t.startsWith("user:") && !t.startsWith("source:"))
                                    .slice(0, 2)
                                    .map((tag: string) => (
                                      <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-accent/10 text-accent/60">
                                        {tag}
                                      </span>
                                    ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleKeep(mem.uuid)}
                                  className="p-1.5 rounded text-muted hover:text-emerald-400 hover:bg-emerald-400/10 transition-all"
                                  title="Looks good"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => handleForgetLearned(mem.uuid)}
                                  disabled={forgettingLearnedId === mem.uuid}
                                  className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                                  title="Forget this"
                                >
                                  {forgettingLearnedId === mem.uuid ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <X size={14} />
                                  )}
                                </button>
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
        )}

        {/* === REVIEW TAB === */}
        {tab === "review" && <DraftReview />}

        {/* === TIMELINE TAB === */}
        {tab === "timeline" && (
          <div className="max-w-3xl mx-auto">
            {timelineLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : timelineMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <CalendarDays size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">No memories yet.</p>
                <p className="text-xs mt-1">Your memory timeline will appear here as you chat.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-6 bottom-0 w-px bg-sidebar-border" />

                {groupByDay(timelineMemories).map((group) => (
                  <div key={group.date} className="mb-6">
                    {/* Day header */}
                    <div className="flex items-center gap-3 mb-3 relative">
                      <div className="w-[31px] flex justify-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-background z-10" />
                      </div>
                      <span className="text-xs font-medium text-accent">{group.date}</span>
                      <span className="text-xs text-muted">({group.memories.length})</span>
                    </div>

                    {/* Day memories */}
                    <div className="space-y-1.5 ml-[31px] pl-4 border-l border-transparent">
                      {group.memories.map((mem) => {
                        const time = new Date(mem.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <div
                            key={mem.uuid}
                            className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-2.5 hover:border-accent/20 transition-colors"
                          >
                            <p className="text-sm text-foreground leading-relaxed">{mem.observation}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-muted">{time}</span>
                              {(() => {
                                const source = getSource(mem.tags);
                                return source ? (
                                  <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${source.className}`}>
                                    {source.label}
                                  </span>
                                ) : null;
                              })()}
                              {mem.tags.filter((t: string) => !t.startsWith("user:") && !t.startsWith("source:")).slice(0, 2).map((tag: string) => (
                                <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-accent/10 text-accent/60">
                                  {tag}
                                </span>
                              ))}
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
        )}

        {/* === INSIGHTS TAB === */}
        {tab === "insights" && isTabLocked("insights") && (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Lock size={48} className="text-accent/20 mb-3" />
            <p className="text-sm font-medium text-foreground">Cortex Insights</p>
            <p className="text-xs mt-1">Available on Pro plan</p>
            <a
              href="https://novyx.ai/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-accent/15 text-accent rounded-md text-xs hover:bg-accent/25 transition-colors"
            >
              Upgrade to Pro →
            </a>
          </div>
        )}
        {tab === "insights" && !isTabLocked("insights") && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Cortex Insights</h3>
                <p className="text-xs text-muted mt-0.5">Patterns discovered across your conversations</p>
              </div>
              <button
                onClick={handleRunCortex}
                disabled={isRunningCortex}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/15 text-accent rounded-md text-xs hover:bg-accent/25 transition-colors disabled:opacity-40"
              >
                {isRunningCortex ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Zap size={12} />
                )}
                Run Cortex
              </button>
            </div>

            {cortexResult && (
              <div className="mb-4 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent">
                {cortexResult}
              </div>
            )}

            {insightsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : insights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <Sparkles size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">No insights yet.</p>
                <p className="text-xs mt-1">Click &quot;Run Cortex&quot; to analyze your memories and discover patterns.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map((insight) => (
                  <div
                    key={insight.uuid}
                    className="bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{insight.observation}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted">{timeAgo(insight.created_at)}</span>
                          {insight.tags.length > 0 && (
                            <div className="flex gap-1">
                              {insight.tags.filter((t: string) => !t.startsWith("user:") && !t.startsWith("source:")).slice(0, 3).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-xs px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400/70"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === GRAPH TAB === */}
        {tab === "graph" && isTabLocked("graph") && (
          <div className="flex flex-col items-center justify-center h-full text-muted">
            <Lock size={48} className="text-accent/20 mb-3" />
            <p className="text-sm font-medium text-foreground">Knowledge Graph</p>
            <p className="text-xs mt-1">Available on Pro plan</p>
            <a
              href="https://novyx.ai/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-accent/15 text-accent rounded-md text-xs hover:bg-accent/25 transition-colors"
            >
              Upgrade to Pro →
            </a>
          </div>
        )}
        {tab === "graph" && !isTabLocked("graph") && (
          <div className="w-full h-full">
            {graphLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : graphNodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted p-4">
                <Share2 size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">No knowledge graph yet.</p>
                <p className="text-xs mt-1">As you chat, entities and relationships will appear here.</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <MemoryGraph nodes={graphNodes} edges={graphEdges} />
                </div>
                <div className="flex items-center justify-between px-4 py-2 border-t border-sidebar-border/50">
                  <span className="text-xs text-muted">{graphNodes.length} entities · {graphEdges.length} connections</span>
                  <button
                    onClick={() => window.open("/api/share/graph", "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                  >
                    <Share2 size={12} />
                    Share my graph
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === CONTEXT TAB === */}
        {tab === "context" && (
          <div className="max-w-3xl mx-auto">
            {contextLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : !context ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <Clock size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">No context available.</p>
                <p className="text-xs mt-1">Start chatting to build up your memory context.</p>
              </div>
            ) : (
              <>
                {context.lastSessionAt && (
                  <p className="text-xs text-muted mb-4">
                    Last session: {timeAgo(context.lastSessionAt)}
                  </p>
                )}

                {context.recent.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Clock size={14} className="text-accent" />
                      Recent ({context.recentCount})
                    </h3>
                    <div className="space-y-2">
                      {context.recent.map((mem) => (
                        <div
                          key={mem.uuid}
                          className="bg-card-bg border border-sidebar-border rounded-lg px-4 py-3"
                        >
                          <p className="text-sm text-foreground leading-relaxed">{mem.observation}</p>
                          <span className="text-xs text-muted mt-1 block">{timeAgo(mem.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {context.upcoming.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      Upcoming ({context.upcomingCount})
                    </h3>
                    <div className="space-y-2">
                      {context.upcoming.map((mem) => (
                        <div
                          key={mem.uuid}
                          className="bg-card-bg border border-sidebar-border rounded-lg px-4 py-3"
                        >
                          <p className="text-sm text-foreground leading-relaxed">{mem.observation}</p>
                          <span className="text-xs text-muted mt-1 block">{timeAgo(mem.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {context.recent.length === 0 && context.upcoming.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted">
                    <Clock size={48} className="text-accent/20 mb-3" />
                    <p className="text-sm">No recent activity.</p>
                    <p className="text-xs mt-1">Chat with the AI to build context.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* === REPLAY TAB === */}
        {tab === "replay" && isTabLocked("replay") && (
          <div className="flex flex-col items-center justify-center h-full text-muted p-4">
            <Lock size={48} className="text-accent/20 mb-3" />
            <p className="text-sm font-medium text-foreground">Memory Replay</p>
            <p className="text-xs mt-1">Available on Pro plan</p>
            <a
              href="https://novyx.ai/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-accent/15 text-accent rounded-md text-xs hover:bg-accent/25 transition-colors"
            >
              Upgrade to Pro →
            </a>
          </div>
        )}
        {tab === "replay" && !isTabLocked("replay") && (
          <div className="max-w-3xl mx-auto">
            {/* Drift summary card */}
            {driftLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="text-accent animate-spin" />
              </div>
            ) : drift && (
              <div className="bg-card-bg border border-sidebar-border rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <History size={14} className="text-accent" />
                  7-Day Drift Analysis
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted">Memories</p>
                    <p className="text-lg font-medium text-foreground">{drift.memoryCountTo}</p>
                    <p className={`text-xs ${drift.memoryCountDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {drift.memoryCountDelta >= 0 ? "+" : ""}{drift.memoryCountDelta} this week
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted">Avg Importance</p>
                    <p className="text-lg font-medium text-foreground">{(drift.avgImportanceTo * 100).toFixed(0)}%</p>
                    <p className={`text-xs ${drift.avgImportanceDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {drift.avgImportanceDelta >= 0 ? "+" : ""}{(drift.avgImportanceDelta * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted">Tag Shifts</p>
                    <p className="text-lg font-medium text-foreground">{drift.tagShifts.length}</p>
                  </div>
                </div>

                {(drift.topNewTopics.length > 0 || drift.topLostTopics.length > 0) && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-sidebar-border">
                    {drift.topNewTopics.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-1">New Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {drift.topNewTopics.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {drift.topLostTopics.length > 0 && (
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Fading Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {drift.topLostTopics.map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Replay timeline */}
            <h3 className="text-sm font-medium text-foreground mb-3">Operation Log</h3>
            {replayLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : replayEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <History size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">No replay data yet.</p>
                <p className="text-xs mt-1">Memory operations will be tracked here.</p>
              </div>
            ) : (
              <>
              <div className="space-y-1">
                {replayEntries.map((entry, i) => {
                  const opColor = entry.operation === "create" ? "text-green-400"
                    : entry.operation === "delete" ? "text-red-400"
                    : entry.operation === "update" ? "text-amber-400"
                    : "text-muted";
                  return (
                    <div key={`${entry.timestamp}-${i}`} className="group flex items-start gap-3 py-2 px-3 rounded hover:bg-card-bg transition-colors">
                      <span className={`text-[10px] font-mono uppercase tracking-wider mt-0.5 w-12 shrink-0 ${opColor}`}>
                        {entry.operation.slice(0, 6)}
                      </span>
                      <div className="flex-1 min-w-0">
                        {entry.observation_preview && (
                          <p className="text-sm text-foreground/80 truncate">{entry.observation_preview}</p>
                        )}
                        <span className="text-[10px] text-muted">{timeAgo(entry.timestamp)}</span>
                      </div>
                      <button
                        onClick={() => handleRollbackPreview(entry.timestamp)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-2 py-1 rounded text-[10px] text-amber-400 hover:bg-amber-400/10 flex items-center gap-1"
                        title="Rollback to this point"
                      >
                        <RotateCcw size={10} />
                        Rollback
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Rollback confirmation dialog */}
              {rollbackTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={handleRollbackCancel}>
                  <div className="fixed inset-0 bg-black/60" />
                  <div
                    className="relative w-full max-w-sm mx-4 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rollbackResult ? (
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center mx-auto mb-3">
                          <Check size={20} className="text-green-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Rollback Complete</h3>
                        <p className="text-xs text-muted mb-4">
                          {(rollbackResult as Record<string, number>).artifacts_restored
                            ? `${(rollbackResult as Record<string, number>).artifacts_restored} memories restored`
                            : "Memory state has been rolled back."}
                        </p>
                        <button
                          onClick={handleRollbackCancel}
                          className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-md bg-amber-400/10 flex items-center justify-center">
                            <RotateCcw size={16} className="text-amber-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Rollback Memory</h3>
                            <p className="text-[11px] text-muted">Revert to {new Date(rollbackTarget).toLocaleString()}</p>
                          </div>
                        </div>

                        {rollbackPreviewLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 size={20} className="text-accent animate-spin" />
                            <span className="text-xs text-muted ml-2">Loading preview...</span>
                          </div>
                        ) : rollbackPreview ? (
                          <div className="rounded-md bg-card-bg border border-sidebar-border p-3 mb-4 space-y-2">
                            {(rollbackPreview as Record<string, number>).operations_to_undo != null && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted">Operations to undo</span>
                                <span className="text-foreground font-medium">{(rollbackPreview as Record<string, number>).operations_to_undo}</span>
                              </div>
                            )}
                            {(rollbackPreview as Record<string, number>).memories_to_restore != null && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted">Memories to restore</span>
                                <span className="text-green-400 font-medium">{(rollbackPreview as Record<string, number>).memories_to_restore}</span>
                              </div>
                            )}
                            {(rollbackPreview as Record<string, number>).memories_to_remove != null && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted">Memories to remove</span>
                                <span className="text-red-400 font-medium">{(rollbackPreview as Record<string, number>).memories_to_remove}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted mb-4">This will undo all memory operations after this point.</p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={handleRollbackCancel}
                            className="flex-1 px-3 py-2 rounded-md text-sm text-muted hover:text-foreground border border-sidebar-border hover:border-foreground/20 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleRollbackExecute}
                            disabled={rollbackExecuting}
                            className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {rollbackExecuting ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Rolling back...
                              </>
                            ) : (
                              <>
                                <RotateCcw size={12} />
                                Confirm Rollback
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* === AUDIT TAB === */}
        {tab === "audit" && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield size={14} className="text-accent" />
                Audit Trail
              </h3>
              <p className="text-xs text-muted mt-0.5">Cryptographic log of all memory operations</p>
            </div>

            {auditLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="text-accent animate-spin" />
              </div>
            ) : auditEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted">
                <Shield size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">No audit entries yet.</p>
                <p className="text-xs mt-1">All memory operations are logged for transparency.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {auditEntries.map((entry, i) => {
                  const opColor = entry.operation === "remember" || entry.operation === "create" ? "text-green-400"
                    : entry.operation === "forget" || entry.operation === "delete" ? "text-red-400"
                    : entry.operation === "cortex_run" ? "text-amber-400"
                    : "text-blue-400";
                  return (
                    <div key={`${entry.timestamp}-${i}`} className="flex items-center gap-3 py-2 px-3 rounded bg-card-bg border border-sidebar-border">
                      <span className={`text-[10px] font-mono uppercase tracking-wider w-16 shrink-0 ${opColor}`}>
                        {entry.operation}
                      </span>
                      <div className="flex-1 min-w-0">
                        {entry.artifact_id && (
                          <span className="text-[10px] font-mono text-muted/60 truncate block">
                            {entry.artifact_id.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted shrink-0">{timeAgo(entry.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Powered by Novyx Core CTA */}
        <div className="mt-6 p-4 rounded-lg border border-sidebar-border/50 bg-card-bg/50 text-center">
          <p className="text-sm text-muted">
            This memory system is powered by{" "}
            <a
              href="https://novyxlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium"
            >
              Novyx Core
            </a>
          </p>
          <p className="text-xs text-muted/70 mt-1">
            Add persistent AI memory to your own app in 6 lines of code.{" "}
            <a
              href="https://novyxlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Learn more →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
