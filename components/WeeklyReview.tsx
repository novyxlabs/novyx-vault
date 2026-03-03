"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  CalendarRange,
  FileText,
  Hash,
  CheckSquare,
  Brain,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Loader2,
  Type,
  Link,
} from "lucide-react";
import { loadSettings, getActiveProvider } from "@/lib/providers";

interface ReviewData {
  period: { from: string; to: string };
  vault: {
    totalNotes: number;
    totalWords: number;
    notesModified: number;
    wordsInModified: number;
  };
  activity: {
    recentNotes: { name: string; path: string; wordCount: number; modifiedAt: string }[];
    topTags: { tag: string; count: number }[];
    linksInModified: number;
  };
  tasks: {
    pending: number;
    completedThisWeek: number;
    sample: { text: string; note: string }[];
  };
  memory: {
    totalMemories: number;
    insights: { observation: string; tags: string[]; importance: number }[];
    drift: {
      memoryDelta: number;
      importanceDelta: number;
      newTopics: string[];
      lostTopics: string[];
      tagShifts: { tag: string; countFrom: number; countTo: number; delta: number }[];
    } | null;
  };
}

interface WeeklyReviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote?: (path: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
      {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {positive ? "+" : ""}{value}{suffix}
    </span>
  );
}

export default function WeeklyReview({ isOpen, onClose, onSelectNote }: WeeklyReviewProps) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState("");
  const [digestLoading, setDigestLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setDigest("");
    fetch("/api/notes/weekly-review")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const generateDigest = async () => {
    if (!data || digestLoading) return;
    const settings = loadSettings();
    const provider = getActiveProvider(settings);
    if (!provider) return;

    setDigestLoading(true);
    setDigest("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/notes/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewData: data,
          provider: { baseURL: provider.baseURL, apiKey: provider.apiKey, model: provider.model },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setDigestLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l: string) => l.startsWith("data: "));
        for (const line of lines) {
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          try {
            const parsed = JSON.parse(d);
            if (parsed.text) {
              full += parsed.text;
              setDigest(full);
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Weekly review digest error:", err);
      }
    } finally {
      setDigestLoading(false);
      abortRef.current = null;
    }
  };

  if (!isOpen) return null;

  const hasProvider = (() => {
    const s = loadSettings();
    return !!getActiveProvider(s);
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Weekly Review"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const modal = e.currentTarget;
          const focusable = modal.querySelectorAll<HTMLElement>(
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
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-accent" />
            <h2 className="text-sm font-medium">Weekly Review</h2>
            {data && (
              <span className="text-[10px] text-muted">
                {formatDate(data.period.from)} — {formatDate(data.period.to)}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-card-bg rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-1">
                    <FileText size={11} />
                    <span className="text-[10px] uppercase tracking-wider">Notes Touched</span>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{data.vault.notesModified}</p>
                  <p className="text-[10px] text-muted">of {data.vault.totalNotes}</p>
                </div>
                <div className="bg-card-bg rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-1">
                    <Type size={11} />
                    <span className="text-[10px] uppercase tracking-wider">Words Written</span>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{data.vault.wordsInModified.toLocaleString()}</p>
                </div>
                <div className="bg-card-bg rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-1">
                    <Link size={11} />
                    <span className="text-[10px] uppercase tracking-wider">Links</span>
                  </div>
                  <p className="text-lg font-semibold tabular-nums">{data.activity.linksInModified}</p>
                </div>
              </div>

              {/* Tasks */}
              {(data.tasks.pending > 0 || data.tasks.completedThisWeek > 0) && (
                <div className="bg-card-bg rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckSquare size={12} className="text-accent" />
                    <span className="text-xs font-medium">Tasks</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted">
                      <span className="text-green-400 font-medium">{data.tasks.completedThisWeek}</span> completed
                    </span>
                    <span className="text-muted">
                      <span className="text-amber-400 font-medium">{data.tasks.pending}</span> pending
                    </span>
                  </div>
                  {data.tasks.sample.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {data.tasks.sample.slice(0, 3).map((t, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted">
                          <span className="shrink-0 mt-0.5 w-3 h-3 border border-sidebar-border rounded-sm" />
                          <span className="truncate">{t.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Notes */}
              {data.activity.recentNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText size={12} className="text-accent" />
                    <span className="text-xs font-medium">Active Notes</span>
                  </div>
                  <div className="space-y-1">
                    {data.activity.recentNotes.slice(0, 6).map((note) => (
                      <button
                        key={note.path}
                        onClick={() => onSelectNote?.(note.path)}
                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs hover:bg-muted-bg transition-colors group"
                      >
                        <span className="truncate text-foreground/80 group-hover:text-foreground">
                          {note.name}
                        </span>
                        <span className="text-[10px] text-muted tabular-nums shrink-0 ml-2">
                          {note.wordCount.toLocaleString()}w
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {data.activity.topTags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hash size={12} className="text-accent" />
                    <span className="text-xs font-medium">Top Tags This Week</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.activity.topTags.map((t) => (
                      <span
                        key={t.tag}
                        className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium"
                      >
                        #{t.tag}
                        <span className="ml-1 text-accent/50">{t.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Memory / Drift */}
              {data.memory.drift && (
                <div className="bg-card-bg rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain size={12} className="text-accent" />
                    <span className="text-xs font-medium">Memory Activity</span>
                    <DeltaBadge value={data.memory.drift.memoryDelta} suffix=" memories" />
                  </div>
                  {data.memory.drift.newTopics.length > 0 && (
                    <div className="mb-1.5">
                      <span className="text-[10px] text-green-400 font-medium uppercase tracking-wider">Emerging</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {data.memory.drift.newTopics.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.memory.drift.lostTopics.length > 0 && (
                    <div>
                      <span className="text-[10px] text-red-400/60 font-medium uppercase tracking-wider">Fading</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {data.memory.drift.lostTopics.map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-400/60 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Insights */}
              {data.memory.insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} className="text-accent" />
                    <span className="text-xs font-medium">AI Insights</span>
                  </div>
                  <div className="space-y-1.5">
                    {data.memory.insights.slice(0, 3).map((ins, i) => (
                      <div key={i} className="text-[11px] text-muted leading-relaxed bg-card-bg rounded-md p-2">
                        {ins.observation}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Digest */}
              {hasProvider && (
                <div className="border-t border-sidebar-border pt-3">
                  {!digest && !digestLoading && (
                    <button
                      onClick={generateDigest}
                      className="flex items-center gap-2 w-full justify-center px-4 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                    >
                      <Sparkles size={13} />
                      Generate AI Weekly Digest
                    </button>
                  )}
                  {digestLoading && !digest && (
                    <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted">
                      <Loader2 size={13} className="animate-spin" />
                      Writing your weekly digest...
                    </div>
                  )}
                  {digest && (
                    <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed text-muted">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={12} className="text-accent" />
                        <span className="text-xs font-medium text-foreground">AI Digest</span>
                        {digestLoading && <Loader2 size={10} className="animate-spin text-accent" />}
                      </div>
                      <div className="whitespace-pre-wrap">{digest}</div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted text-sm py-8">
              Could not load weekly data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
