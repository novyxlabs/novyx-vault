"use client";

import { useState, useEffect, useCallback } from "react";
import {
  GitMerge, GitPullRequest, X, Check, ChevronLeft, Loader2,
  Eye, ArrowRight, Tag, RefreshCw, AlertCircle,
} from "lucide-react";

// --- Types ---

interface Draft {
  draft_id: string;
  branch_id?: string;
  observation: string;
  tags: string[];
  importance: number;
  confidence: number;
  status: "draft" | "merged" | "rejected";
  review_summary?: {
    recommendation: "merge" | "review" | "skip";
    reason?: string;
    similar_count?: number;
    max_similarity?: number;
  };
  source?: string;
  created_at: string;
  decided_at?: string;
}

interface DraftDiff {
  draft_id: string;
  proposed: {
    observation: string;
    tags: string[];
    importance: number;
    confidence: number;
  };
  existing?: {
    uuid: string;
    observation: string;
    tags: string[];
    importance: number;
    confidence: number;
  } | null;
  field_diffs: {
    field: string;
    current?: string | number | string[];
    proposed: string | number | string[];
    changed: boolean;
  }[];
  similar_memories: {
    uuid: string;
    observation: string;
    similarity: number;
  }[];
  review_summary?: Draft["review_summary"];
}

interface Branch {
  branch_id: string;
  drafts: Draft[];
  counts: {
    total: number;
    draft: number;
    merged: number;
    rejected: number;
  };
  recommendations?: {
    merge: number;
    review: number;
    skip: number;
  };
  created_at?: string;
}

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Open", className: "bg-amber-400/15 text-amber-400" },
  merged: { label: "Merged", className: "bg-emerald-400/15 text-emerald-400" },
  rejected: { label: "Rejected", className: "bg-red-400/15 text-red-400" },
};

const REC_STYLES: Record<string, { label: string; className: string }> = {
  merge: { label: "Merge", className: "bg-emerald-400/15 text-emerald-400" },
  review: { label: "Review", className: "bg-amber-400/15 text-amber-400" },
  skip: { label: "Skip", className: "bg-muted-bg text-muted" },
};

type View = "list" | "diff" | "branch";

// --- Skeleton ---

function DiffSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-muted-bg" />
          <div className="w-24 h-4 rounded bg-muted-bg" />
          <div className="w-12 h-4 rounded-full bg-muted-bg" />
        </div>
        <div className="flex gap-2">
          <div className="w-16 h-7 rounded bg-muted-bg" />
          <div className="w-16 h-7 rounded bg-muted-bg" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-sidebar-border bg-card-bg p-4 space-y-3">
          <div className="w-12 h-3 rounded bg-muted-bg" />
          <div className="w-full h-4 rounded bg-muted-bg" />
          <div className="w-3/4 h-4 rounded bg-muted-bg" />
          <div className="flex gap-2">
            <div className="w-12 h-4 rounded bg-muted-bg" />
            <div className="w-12 h-4 rounded bg-muted-bg" />
          </div>
        </div>
        <div className="rounded-lg border border-accent/20 bg-card-bg p-4 space-y-3">
          <div className="w-14 h-3 rounded bg-accent/10" />
          <div className="w-full h-4 rounded bg-accent/10" />
          <div className="w-3/4 h-4 rounded bg-accent/10" />
          <div className="flex gap-2">
            <div className="w-12 h-4 rounded bg-accent/10" />
            <div className="w-12 h-4 rounded bg-accent/10" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-sidebar-border bg-card-bg p-4 space-y-2">
        <div className="w-16 h-3 rounded bg-muted-bg" />
        <div className="w-full h-3 rounded bg-muted-bg" />
        <div className="w-2/3 h-3 rounded bg-muted-bg" />
      </div>
    </div>
  );
}

// --- Toast ---

function ActionToast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium animate-in slide-in-from-bottom-2 ${
      type === "success" ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
    }`}>
      {type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
      {message}
    </div>
  );
}

// --- Confirm dialog ---

function ConfirmDialog({ title, description, confirmLabel, destructive, onConfirm, onCancel }: {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-card-bg border border-sidebar-border rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
        <h3 className="text-sm font-medium text-foreground mb-2">{title}</h3>
        <p className="text-xs text-muted leading-relaxed mb-5">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs text-muted hover:text-foreground hover:bg-muted-bg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              destructive
                ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Component ---

export default function DraftReview() {
  const [view, setView] = useState<View>("list");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true); // start true for initial load
  const [statusFilter, setStatusFilter] = useState<string>("draft");

  // Diff view
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [diff, setDiff] = useState<DraftDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState(false);

  // Branch view
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void;
  } | null>(null);

  // Track locally-decided drafts to prevent double action from stale UI
  const [decidedIds, setDecidedIds] = useState<Set<string>>(new Set());

  // --- Fetch ---

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/memory/drafts?${params}`);
      const data = await res.json();
      setDrafts(data.drafts || []);
      setTotal(data.total || 0);
      setDecidedIds(new Set()); // clear stale state on fresh fetch
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchDiff = useCallback(async (draftId: string) => {
    setDiffLoading(true);
    setDiff(null);
    setDiffError(false);
    try {
      const res = await fetch(`/api/memory/drafts/${draftId}/diff`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDiff(data);
    } catch {
      setDiff(null);
      setDiffError(true);
    } finally {
      setDiffLoading(false);
    }
  }, []);

  const fetchBranch = useCallback(async (branchId: string) => {
    setBranchLoading(true);
    setBranch(null);
    try {
      const res = await fetch(`/api/memory/branches/${branchId}`);
      const data = await res.json();
      setBranch(data);
    } catch {
      setBranch(null);
    } finally {
      setBranchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // --- Actions with safety ---

  const isDraftActionable = (d: Draft) => d.status === "draft" && !decidedIds.has(d.draft_id);

  const handleMergeDraft = async (draftId: string) => {
    if (decidedIds.has(draftId)) {
      setToast({ message: "Already decided — refresh for latest state", type: "error" });
      return;
    }
    setActionLoading(draftId);
    try {
      const res = await fetch(`/api/memory/drafts/${draftId}/merge`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Merge failed");
      }
      setDecidedIds(prev => new Set(prev).add(draftId));
      setDrafts(prev => prev.map(d => d.draft_id === draftId ? { ...d, status: "merged" as const } : d));
      setToast({ message: "Draft merged into memory", type: "success" });
      // If in diff view, go back after brief delay
      if (view === "diff" && selectedDraftId === draftId) {
        setTimeout(backToList, 600);
      }
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Merge failed", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDraft = async (draftId: string) => {
    if (decidedIds.has(draftId)) {
      setToast({ message: "Already decided — refresh for latest state", type: "error" });
      return;
    }
    setActionLoading(draftId);
    try {
      const res = await fetch(`/api/memory/drafts/${draftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Reject failed");
      }
      setDecidedIds(prev => new Set(prev).add(draftId));
      setDrafts(prev => prev.map(d => d.draft_id === draftId ? { ...d, status: "rejected" as const } : d));
      setToast({ message: "Draft rejected", type: "success" });
      if (view === "diff" && selectedDraftId === draftId) {
        setTimeout(backToList, 600);
      }
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Reject failed", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMergeBranch = (branchId: string) => {
    const openCount = branch?.counts.draft || drafts.filter(d => d.branch_id === branchId && d.status === "draft").length;
    setConfirm({
      title: `Merge ${openCount} open draft${openCount === 1 ? "" : "s"}?`,
      description: `This will merge all open drafts in branch ${branchId.slice(0, 12)}… into canonical memory. This cannot be undone.`,
      confirmLabel: `Merge ${openCount} draft${openCount === 1 ? "" : "s"}`,
      onConfirm: async () => {
        setConfirm(null);
        setActionLoading(branchId);
        try {
          await fetch(`/api/memory/branches/${branchId}/merge`, { method: "POST" });
          setToast({ message: `Branch merged — ${openCount} draft${openCount === 1 ? "" : "s"} committed`, type: "success" });
          if (branch) {
            setBranch({
              ...branch,
              drafts: branch.drafts.map(d => d.status === "draft" ? { ...d, status: "merged" as const } : d),
              counts: { ...branch.counts, merged: branch.counts.merged + branch.counts.draft, draft: 0 },
            });
          }
          fetchDrafts();
        } catch {
          setToast({ message: "Branch merge failed", type: "error" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleRejectBranch = (branchId: string) => {
    const openCount = branch?.counts.draft || drafts.filter(d => d.branch_id === branchId && d.status === "draft").length;
    setConfirm({
      title: `Reject ${openCount} open draft${openCount === 1 ? "" : "s"}?`,
      description: `This will reject all open drafts in branch ${branchId.slice(0, 12)}…. Rejected drafts are not written to memory.`,
      confirmLabel: `Reject ${openCount} draft${openCount === 1 ? "" : "s"}`,
      destructive: true,
      onConfirm: async () => {
        setConfirm(null);
        setActionLoading(branchId);
        try {
          await fetch(`/api/memory/branches/${branchId}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          setToast({ message: `Branch rejected — ${openCount} draft${openCount === 1 ? "" : "s"} discarded`, type: "success" });
          if (branch) {
            setBranch({
              ...branch,
              drafts: branch.drafts.map(d => d.status === "draft" ? { ...d, status: "rejected" as const } : d),
              counts: { ...branch.counts, rejected: branch.counts.rejected + branch.counts.draft, draft: 0 },
            });
          }
          fetchDrafts();
        } catch {
          setToast({ message: "Branch reject failed", type: "error" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleBatchMergeAll = () => {
    setConfirm({
      title: `Merge all ${openCount} open draft${openCount === 1 ? "" : "s"}?`,
      description: "This will merge every open draft into canonical memory. This cannot be undone.",
      confirmLabel: `Merge ${openCount} draft${openCount === 1 ? "" : "s"}`,
      onConfirm: async () => {
        setConfirm(null);
        setActionLoading("batch-merge");
        try {
          const open = drafts.filter(d => d.status === "draft" && !decidedIds.has(d.draft_id));
          await Promise.all(open.map(d =>
            fetch(`/api/memory/drafts/${d.draft_id}/merge`, { method: "POST" })
          ));
          setToast({ message: `${open.length} draft${open.length === 1 ? "" : "s"} merged`, type: "success" });
          fetchDrafts();
        } catch {
          setToast({ message: "Batch merge failed", type: "error" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleBatchRejectAll = () => {
    setConfirm({
      title: `Reject all ${openCount} open draft${openCount === 1 ? "" : "s"}?`,
      description: "This will reject every open draft. Rejected drafts are not written to memory.",
      confirmLabel: `Reject ${openCount} draft${openCount === 1 ? "" : "s"}`,
      destructive: true,
      onConfirm: async () => {
        setConfirm(null);
        setActionLoading("batch-reject");
        try {
          const open = drafts.filter(d => d.status === "draft" && !decidedIds.has(d.draft_id));
          await Promise.all(open.map(d =>
            fetch(`/api/memory/drafts/${d.draft_id}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            })
          ));
          setToast({ message: `${open.length} draft${open.length === 1 ? "" : "s"} rejected`, type: "success" });
          fetchDrafts();
        } catch {
          setToast({ message: "Batch reject failed", type: "error" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  // --- Navigation ---

  const openDiff = (draftId: string) => {
    const draft = drafts.find(d => d.draft_id === draftId) || null;
    setSelectedDraftId(draftId);
    setSelectedDraft(draft);
    fetchDiff(draftId);
    setView("diff");
  };

  const openBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    fetchBranch(branchId);
    setView("branch");
  };

  const backToList = () => {
    setView("list");
    setDiff(null);
    setDiffError(false);
    setBranch(null);
    setSelectedDraft(null);
    fetchDrafts();
  };

  // --- Derived ---

  const openCount = drafts.filter(d => d.status === "draft" && !decidedIds.has(d.draft_id)).length;
  const branches = [...new Set(drafts.filter(d => d.branch_id).map(d => d.branch_id!))];

  // =========================================================================
  // RENDER
  // =========================================================================

  const renderToast = toast && (
    <ActionToast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
  );

  const renderConfirm = confirm && (
    <ConfirmDialog
      title={confirm.title}
      description={confirm.description}
      confirmLabel={confirm.confirmLabel}
      destructive={confirm.destructive}
      onConfirm={confirm.onConfirm}
      onCancel={() => setConfirm(null)}
    />
  );

  // --- DIFF VIEW ---
  if (view === "diff") {
    const draftStatus = selectedDraft?.status || drafts.find(d => d.draft_id === selectedDraftId)?.status;
    const isDecided = draftStatus !== "draft" || (selectedDraftId && decidedIds.has(selectedDraftId));

    return (
      <div className="max-w-4xl mx-auto">
        {renderToast}
        {renderConfirm}
        <button onClick={backToList} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground mb-4 transition-colors">
          <ChevronLeft size={14} /> Back to drafts
        </button>

        {diffLoading ? (
          <DiffSkeleton />
        ) : diffError ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <AlertCircle size={32} className="text-red-400/40 mb-3" />
            <p className="text-sm">Failed to load diff</p>
            <button onClick={() => selectedDraftId && fetchDiff(selectedDraftId)} className="text-xs text-accent hover:underline mt-2">
              Try again
            </button>
          </div>
        ) : !diff ? (
          <p className="text-sm text-muted text-center py-12">No diff data available.</p>
        ) : (
          <div className="space-y-6">
            {/* Header with recommendation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GitPullRequest size={18} className="text-accent" />
                <span className="text-sm font-medium">Memory Diff</span>
                {diff.review_summary && (() => {
                  const rec = REC_STYLES[diff.review_summary!.recommendation];
                  return rec ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${rec.className}`}>
                      {rec.label}
                    </span>
                  ) : null;
                })()}
                {isDecided && draftStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[draftStatus]?.className || ""}`}>
                    {STATUS_STYLES[draftStatus]?.label || draftStatus}
                  </span>
                )}
              </div>
              {!isDecided ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectedDraftId && handleMergeDraft(selectedDraftId)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selectedDraftId ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                    Merge
                  </button>
                  <button
                    onClick={() => selectedDraftId && handleRejectDraft(selectedDraftId)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400/15 text-red-400 rounded-md text-xs hover:bg-red-400/25 transition-colors disabled:opacity-50"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-muted">Already {draftStatus}</span>
              )}
            </div>

            {diff.review_summary?.reason && (
              <p className="text-xs text-muted italic">{diff.review_summary.reason}</p>
            )}

            {/* Side-by-side diff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-sidebar-border bg-card-bg p-4">
                <div className="text-[10px] font-medium text-muted uppercase tracking-wide mb-3">Current</div>
                {diff.existing ? (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground leading-relaxed">{diff.existing.observation}</p>
                    <div className="flex flex-wrap gap-1">
                      {diff.existing.tags.filter(t => !t.startsWith("user:")).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted-bg text-muted">{tag}</span>
                      ))}
                    </div>
                    <div className="flex gap-4 text-[10px] text-muted">
                      <span>Importance: {(diff.existing.importance * 10).toFixed(1)}</span>
                      <span>Confidence: {(diff.existing.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted italic flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400/40" />
                    New memory — nothing to compare
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-accent/30 bg-card-bg p-4">
                <div className="text-[10px] font-medium text-accent uppercase tracking-wide mb-3">Proposed</div>
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">{diff.proposed.observation}</p>
                  <div className="flex flex-wrap gap-1">
                    {diff.proposed.tags.filter(t => !t.startsWith("user:")).map(tag => {
                      const isNew = !diff.existing?.tags.includes(tag);
                      return (
                        <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded ${isNew ? "bg-emerald-400/15 text-emerald-400" : "bg-muted-bg text-muted"}`}>
                          {isNew && "+"} {tag}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted">
                    <span>Importance: {(diff.proposed.importance * 10).toFixed(1)}</span>
                    <span>Confidence: {(diff.proposed.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Field-level diffs */}
            {diff.field_diffs.filter(f => f.changed).length > 0 && (
              <div className="rounded-lg border border-sidebar-border bg-card-bg p-4">
                <div className="text-[10px] font-medium text-muted uppercase tracking-wide mb-3">Changes</div>
                <div className="space-y-2">
                  {diff.field_diffs.filter(f => f.changed).map(f => (
                    <div key={f.field} className="flex items-center gap-3 text-xs">
                      <span className="text-muted w-24 shrink-0">{f.field}</span>
                      <span className="text-red-400/70 line-through truncate max-w-[200px]">
                        {Array.isArray(f.current) ? f.current.join(", ") : String(f.current ?? "—")}
                      </span>
                      <ArrowRight size={10} className="text-muted shrink-0" />
                      <span className="text-emerald-400 truncate max-w-[200px]">
                        {Array.isArray(f.proposed) ? f.proposed.join(", ") : String(f.proposed)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar memories */}
            {diff.similar_memories.length > 0 && (
              <div className="rounded-lg border border-sidebar-border bg-card-bg p-4">
                <div className="text-[10px] font-medium text-muted uppercase tracking-wide mb-3">
                  Similar Memories ({diff.similar_memories.length})
                </div>
                <div className="space-y-2">
                  {diff.similar_memories.map(sim => (
                    <div key={sim.uuid} className="flex items-start gap-3">
                      <span className="text-[10px] text-accent font-mono shrink-0 mt-0.5">
                        {(sim.similarity * 100).toFixed(0)}%
                      </span>
                      <p className="text-xs text-muted leading-relaxed">{sim.observation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- BRANCH VIEW ---
  if (view === "branch" && selectedBranchId) {
    return (
      <div className="max-w-3xl mx-auto">
        {renderToast}
        {renderConfirm}
        <button onClick={backToList} className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground mb-4 transition-colors">
          <ChevronLeft size={14} /> Back to drafts
        </button>

        {branchLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : !branch ? (
          <p className="text-sm text-muted text-center py-12">Failed to load branch.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <GitPullRequest size={16} className="text-accent" />
                  <span className="text-sm font-medium font-mono">{branch.branch_id}</span>
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-muted">
                  <span>{branch.counts.total} total</span>
                  <span className="text-amber-400">{branch.counts.draft} open</span>
                  <span className="text-emerald-400">{branch.counts.merged} merged</span>
                  <span className="text-red-400">{branch.counts.rejected} rejected</span>
                </div>
              </div>
              {branch.counts.draft > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMergeBranch(selectedBranchId)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === selectedBranchId ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                    Merge Branch
                  </button>
                  <button
                    onClick={() => handleRejectBranch(selectedBranchId)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400/15 text-red-400 rounded-md text-xs hover:bg-red-400/25 transition-colors disabled:opacity-50"
                  >
                    <X size={12} /> Reject Branch
                  </button>
                </div>
              )}
            </div>

            {branch.recommendations && (
              <div className="flex gap-3">
                {Object.entries(branch.recommendations).map(([key, count]) => {
                  const style = REC_STYLES[key];
                  if (!style || count === 0) return null;
                  return (
                    <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.className}`}>
                      {count} {style.label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="space-y-1.5">
              {branch.drafts.map(d => {
                const st = STATUS_STYLES[d.status];
                const rec = d.review_summary ? REC_STYLES[d.review_summary.recommendation] : null;
                const actionable = isDraftActionable(d);
                return (
                  <div key={d.draft_id} className="group bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{d.observation}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-muted">{timeAgo(d.created_at)}</span>
                          {st && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${st.className}`}>{st.label}</span>}
                          {rec && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rec.className}`}>{rec.label}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openDiff(d.draft_id)} className="p-1.5 rounded text-muted hover:text-accent hover:bg-accent/10 transition-all" title="View diff">
                          <Eye size={14} />
                        </button>
                        {actionable && (
                          <>
                            <button onClick={() => handleMergeDraft(d.draft_id)} disabled={!!actionLoading} className="p-1.5 rounded text-muted hover:text-emerald-400 hover:bg-emerald-400/10 transition-all" title="Merge">
                              {actionLoading === d.draft_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            </button>
                            <button onClick={() => handleRejectDraft(d.draft_id)} disabled={!!actionLoading} className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-all" title="Reject">
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- DRAFTS LIST ---
  return (
    <div className="max-w-3xl mx-auto">
      {renderToast}
      {renderConfirm}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Review</h3>
          <p className="text-xs text-muted mt-0.5">
            {openCount > 0
              ? `${openCount} draft${openCount === 1 ? "" : "s"} waiting for review`
              : "Memory drafts from your agents appear here"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDrafts}
            disabled={loading}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {openCount > 0 && (
            <>
              <button
                onClick={handleBatchMergeAll}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                {actionLoading === "batch-merge" ? <Loader2 size={12} className="animate-spin" /> : <GitMerge size={12} />}
                Merge All
              </button>
              <button
                onClick={handleBatchRejectAll}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400/15 text-red-400 rounded-md text-xs hover:bg-red-400/25 transition-colors disabled:opacity-50"
              >
                {actionLoading === "batch-reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Reject All
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {[
          { value: "draft", label: "Open" },
          { value: "merged", label: "Merged" },
          { value: "rejected", label: "Rejected" },
          { value: "", label: "All" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              statusFilter === f.value ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground hover:bg-muted-bg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {branches.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-medium text-muted uppercase tracking-wide mb-2">Branches</div>
          <div className="flex flex-wrap gap-1.5">
            {branches.map(bid => {
              const openInBranch = drafts.filter(d => d.branch_id === bid && d.status === "draft").length;
              return (
                <button
                  key={bid}
                  onClick={() => openBranch(bid)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-sidebar-border text-xs text-muted hover:text-foreground hover:border-accent/30 transition-colors"
                >
                  <GitPullRequest size={12} />
                  <span className="font-mono truncate max-w-[120px]">{bid}</span>
                  {openInBranch > 0 && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-amber-400/15 text-amber-400 font-medium">{openInBranch}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-accent animate-spin" />
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted">
          <div className="w-16 h-16 rounded-2xl bg-accent/5 flex items-center justify-center mb-4">
            <GitPullRequest size={28} className="text-accent/30" />
          </div>
          <p className="text-sm font-medium text-foreground/60 mb-1">
            {statusFilter === "draft" ? "No drafts to review" : `No ${statusFilter || ""} drafts`}
          </p>
          <p className="text-xs text-center max-w-xs leading-relaxed">
            {statusFilter === "draft"
              ? "When agents learn new things through Novyx, their proposed memory changes will appear here for you to review — like a PR for what your AI knows."
              : "Try switching to a different filter to see past drafts."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {drafts.map(d => {
            const st = STATUS_STYLES[d.status];
            const rec = d.review_summary ? REC_STYLES[d.review_summary.recommendation] : null;
            const actionable = isDraftActionable(d);
            return (
              <div key={d.draft_id} className="group bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 hover:border-accent/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">{d.observation}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-muted">{timeAgo(d.created_at)}</span>
                      {st && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${st.className}`}>{st.label}</span>}
                      {rec && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rec.className}`}>{rec.label}</span>}
                      {d.source && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted-bg text-muted">{d.source}</span>}
                      {d.branch_id && (
                        <button onClick={(e) => { e.stopPropagation(); openBranch(d.branch_id!); }} className="flex items-center gap-1 text-[10px] text-accent/60 hover:text-accent transition-colors">
                          <Tag size={8} />
                          <span className="font-mono">{d.branch_id.slice(0, 8)}</span>
                        </button>
                      )}
                      {d.review_summary?.similar_count !== undefined && d.review_summary.similar_count > 0 && (
                        <span className="text-[10px] text-muted">
                          {d.review_summary.similar_count} similar ({((d.review_summary.max_similarity || 0) * 100).toFixed(0)}% max)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openDiff(d.draft_id)} className="p-1.5 rounded text-muted hover:text-accent hover:bg-accent/10 transition-all" title="View diff">
                      <Eye size={14} />
                    </button>
                    {actionable && (
                      <>
                        <button onClick={() => handleMergeDraft(d.draft_id)} disabled={!!actionLoading} className="p-1.5 rounded text-muted hover:text-emerald-400 hover:bg-emerald-400/10 transition-all" title="Merge">
                          {actionLoading === d.draft_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button onClick={() => handleRejectDraft(d.draft_id)} disabled={!!actionLoading} className="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-all" title="Reject">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
