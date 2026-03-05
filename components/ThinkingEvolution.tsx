"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  TrendingUp,
  Search,
  Calendar,
  Tag,
  ArrowUp,
  ArrowDown,
  Clock,
  Brain,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ThinkingEvolutionProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MemoryEntry {
  observation: string;
  importance: number;
  created_at: string;
  tags: string[];
  score?: number;
}

interface TagShift {
  tag: string;
  countFrom: number;
  countTo: number;
  delta: number;
}

interface DriftData {
  newTopics: string[];
  lostTopics: string[];
  memoryDelta: number;
  importanceDelta: number;
  tagShifts: TagShift[];
}

interface TimelineEntry {
  timestamp: string;
  operation: string;
  preview: string | null;
  importance: number | null;
}

interface ThinkingData {
  topic: string;
  timeframe: { from: string; to: string };
  memories: MemoryEntry[];
  drift: DriftData | null;
  timeline: TimelineEntry[];
  totalMemories: number;
}

type Timeframe = "7" | "30" | "90" | "all";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function importanceColor(importance: number): {
  dot: string;
  label: string;
  bg: string;
} {
  // Novyx importance is 1-10 scale
  if (importance >= 7)
    return { dot: "bg-green-400", label: "high", bg: "bg-green-400/10" };
  if (importance >= 4)
    return { dot: "bg-amber-400", label: "med", bg: "bg-amber-400/10" };
  return { dot: "bg-muted", label: "low", bg: "bg-muted-bg" };
}

function groupByMonth(
  memories: MemoryEntry[]
): { month: string; memories: MemoryEntry[] }[] {
  const groups: Record<string, MemoryEntry[]> = {};
  for (const mem of memories) {
    const key = formatMonthKey(mem.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(mem);
  }
  // Sort groups by most recent month first
  return Object.entries(groups)
    .sort(
      ([, a], [, b]) =>
        new Date(b[0].created_at).getTime() -
        new Date(a[0].created_at).getTime()
    )
    .map(([month, mems]) => ({
      month,
      memories: mems.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }));
}

export default function ThinkingEvolution({
  isOpen,
  onClose,
}: ThinkingEvolutionProps) {
  const [topic, setTopic] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("30");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<ThinkingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTopic("");
      setTimeframe("30");
      setData(null);
      setError(null);
      setHasSearched(false);
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleSearch = useCallback(async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const days = timeframe === "all" ? "3650" : timeframe;
      const params = new URLSearchParams({
        topic: topic.trim(),
        days,
      });
      const res = await fetch(`/api/thinking?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch data");
      }
      const result: ThinkingData = await res.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [topic, timeframe]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  if (!isOpen) return null;

  const grouped = data ? groupByMonth(data.memories) : [];
  const firstMention =
    data && data.memories.length > 0
      ? formatDate(data.memories[0].created_at)
      : null;
  const lastMention =
    data && data.memories.length > 0
      ? formatDate(data.memories[data.memories.length - 1].created_at)
      : null;

  // Find peak importance period: the month with highest average importance
  let peakPeriod: string | null = null;
  if (grouped.length > 0) {
    let maxAvg = -1;
    for (const group of grouped) {
      const avg =
        group.memories.reduce((sum, m) => sum + m.importance, 0) /
        group.memories.length;
      if (avg > maxAvg) {
        maxAvg = avg;
        peakPeriod = group.month;
      }
    }
  }

  const timeframeLabels: Record<Timeframe, string> = {
    "7": "7 days",
    "30": "30 days",
    "90": "90 days",
    all: "All time",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            <span className="text-sm font-medium text-foreground">
              Thinking Evolution
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-4 border-b border-sidebar-border shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="What topic do you want to explore?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-card-bg border border-sidebar-border rounded-lg py-2 pl-9 pr-3 text-sm text-foreground placeholder-muted outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={handleSearch}
              disabled={!topic.trim() || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={28} className="text-accent animate-spin mb-3" />
              <p className="text-sm text-muted">
                Analyzing your thinking on &quot;{topic}&quot;...
              </p>
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm text-red-400 max-w-md text-center">
                {error}
              </div>
            </div>
          )}

          {/* Empty state (no search yet) */}
          {!isLoading && !error && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-16 text-muted">
              <Brain size={48} className="text-accent/20 mb-3" />
              <p className="text-sm">
                Search for a topic to see how your thinking has evolved
              </p>
              <p className="text-xs mt-1.5 text-muted/70">
                Try topics like &quot;AI&quot;, &quot;productivity&quot;, or
                &quot;project ideas&quot;
              </p>
            </div>
          )}

          {/* No results */}
          {!isLoading &&
            !error &&
            hasSearched &&
            data &&
            data.memories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted">
                <Search size={48} className="text-accent/20 mb-3" />
                <p className="text-sm">
                  No memories found for &quot;{data.topic}&quot; in the last{" "}
                  {timeframeLabels[timeframe]}.
                </p>
                <p className="text-xs mt-1.5 text-muted/70">
                  Try a broader topic or a longer timeframe.
                </p>
              </div>
            )}

          {/* Results */}
          {!isLoading && !error && data && data.memories.length > 0 && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div
                className="ghost-fade-in grid grid-cols-4 gap-3"
                style={{ animationDelay: "0ms" }}
              >
                <div className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Brain size={12} className="text-accent" />
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      Total
                    </span>
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {data.totalMemories}
                  </p>
                  <p className="text-[10px] text-muted">
                    memories on topic
                  </p>
                </div>
                <div className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={12} className="text-accent" />
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      First
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {firstMention}
                  </p>
                  <p className="text-[10px] text-muted">first mention</p>
                </div>
                <div className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar size={12} className="text-accent" />
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      Latest
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {lastMention}
                  </p>
                  <p className="text-[10px] text-muted">most recent</p>
                </div>
                <div className="bg-card-bg border border-sidebar-border rounded-lg px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={12} className="text-amber-400" />
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      Peak
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {peakPeriod || "N/A"}
                  </p>
                  <p className="text-[10px] text-muted">
                    highest importance
                  </p>
                </div>
              </div>

              {/* Drift Analysis */}
              {data.drift && (
                <div
                  className="ghost-fade-in bg-card-bg border border-sidebar-border rounded-lg p-4"
                  style={{ animationDelay: "100ms" }}
                >
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-accent" />
                    Your focus has shifted
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted">
                        Memory Change
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {data.drift.memoryDelta >= 0 ? (
                          <ArrowUp size={14} className="text-green-400" />
                        ) : (
                          <ArrowDown size={14} className="text-red-400" />
                        )}
                        <span
                          className={`text-lg font-medium ${
                            data.drift.memoryDelta >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {data.drift.memoryDelta >= 0 ? "+" : ""}
                          {data.drift.memoryDelta}
                        </span>
                        <span className="text-xs text-muted">memories</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted">
                        Avg Importance
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {data.drift.importanceDelta >= 0 ? (
                          <ArrowUp size={14} className="text-green-400" />
                        ) : (
                          <ArrowDown size={14} className="text-red-400" />
                        )}
                        <span
                          className={`text-lg font-medium ${
                            data.drift.importanceDelta >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {data.drift.importanceDelta >= 0 ? "+" : ""}
                          {data.drift.importanceDelta.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* New & Lost Topics */}
                  {(data.drift.newTopics.length > 0 ||
                    data.drift.lostTopics.length > 0) && (
                    <div className="flex gap-4 pt-3 border-t border-sidebar-border">
                      {data.drift.newTopics.length > 0 && (
                        <div className="flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
                            Emerged
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {data.drift.newTopics.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.drift.lostTopics.length > 0 && (
                        <div className="flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
                            Faded
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {data.drift.lostTopics.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-red-400/10 text-red-400"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tag Shifts */}
                  {data.drift.tagShifts.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-sidebar-border">
                      <p className="text-[10px] uppercase tracking-wider text-muted mb-2">
                        Tag Shifts
                      </p>
                      <div className="space-y-1.5">
                        {data.drift.tagShifts.slice(0, 8).map((shift) => (
                          <div
                            key={shift.tag}
                            className="flex items-center gap-2 text-xs"
                          >
                            <Tag size={10} className="text-muted shrink-0" />
                            <span className="text-foreground/80 flex-1 min-w-0 truncate">
                              {shift.tag}
                            </span>
                            <span className="text-muted shrink-0">
                              {shift.countFrom}
                            </span>
                            <span className="text-muted shrink-0">
                              &rarr;
                            </span>
                            <span className="text-foreground shrink-0">
                              {shift.countTo}
                            </span>
                            <span
                              className={`text-[10px] shrink-0 ${
                                shift.delta > 0
                                  ? "text-green-400"
                                  : shift.delta < 0
                                  ? "text-red-400"
                                  : "text-muted"
                              }`}
                            >
                              {shift.delta > 0 ? "+" : ""}
                              {shift.delta}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Memory Timeline */}
              <div
                className="ghost-fade-in"
                style={{ animationDelay: "200ms" }}
              >
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-accent" />
                  Memory Timeline
                  <span className="text-xs text-muted font-normal">
                    ({data.memories.length} in period)
                  </span>
                </h3>

                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-6 bottom-0 w-px bg-sidebar-border" />

                  {grouped.map((group, gi) => (
                    <div
                      key={group.month}
                      className="mb-5 ghost-fade-in"
                      style={{ animationDelay: `${250 + gi * 80}ms` }}
                    >
                      {/* Month header */}
                      <div className="flex items-center gap-3 mb-2.5 relative">
                        <div className="w-[31px] flex justify-center shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-sidebar-bg z-10" />
                        </div>
                        <span className="text-xs font-medium text-accent">
                          {group.month}
                        </span>
                        <span className="text-xs text-muted">
                          ({group.memories.length})
                        </span>
                      </div>

                      {/* Memories in month */}
                      <div className="space-y-1.5 ml-[31px] pl-4">
                        {group.memories.map((mem, mi) => {
                          const imp = importanceColor(mem.importance);
                          const date = new Date(
                            mem.created_at
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                          const time = new Date(
                            mem.created_at
                          ).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          return (
                            <div
                              key={`${mem.created_at}-${mi}`}
                              className="ghost-fade-in bg-card-bg border border-sidebar-border rounded-lg px-3 py-2.5 hover:border-accent/20 transition-colors"
                              style={{
                                animationDelay: `${300 + gi * 80 + mi * 50}ms`,
                              }}
                            >
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${imp.dot}`}
                                  title={`Importance: ${imp.label}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground leading-relaxed">
                                    {mem.observation.length > 200
                                      ? mem.observation.slice(0, 200) + "..."
                                      : mem.observation}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[10px] text-muted">
                                      {date} at {time}
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded ${imp.bg} ${
                                        imp.label === "high"
                                          ? "text-green-400"
                                          : imp.label === "med"
                                          ? "text-amber-400"
                                          : "text-muted"
                                      }`}
                                    >
                                      {mem.importance}/10
                                    </span>
                                    {mem.tags.filter((t: string) => !t.startsWith("user:")).length > 0 && (
                                      <div className="flex gap-1">
                                        {mem.tags.filter((t: string) => !t.startsWith("user:")).slice(0, 3).map((tag: string) => (
                                          <span
                                            key={tag}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent/70"
                                          >
                                            {tag}
                                          </span>
                                        ))}
                                        {mem.tags.filter((t: string) => !t.startsWith("user:")).length > 3 && (
                                          <span className="text-[10px] text-muted">
                                            +{mem.tags.filter((t: string) => !t.startsWith("user:")).length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
