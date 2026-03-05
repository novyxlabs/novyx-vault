"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sun,
  Moon,
  Sunset,
  Sparkles,
  MessageCircle,
  PenLine,
  Mic,
  RefreshCw,
  FileText,
  ArrowRight,
  Settings,
} from "lucide-react";
import { loadSettings, getActiveProvider } from "@/lib/providers";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BriefingData {
  lastSession: string | null;
  memoryCount: number;
  noteCount: number;
  recentMemories: {
    observation: string;
    importance: number;
    tags: string[];
    created_at: string;
  }[];
  insights: {
    observation: string;
    tags: string[];
    importance: number;
  }[];
  drift: {
    newTopics: string[];
    lostTopics: string[];
    memoryDelta: number;
    importanceDelta: number;
    tagShifts: { tag: string; delta: number }[];
  } | null;
  pendingTasks: number;
  tasksDue: { text: string; note: string }[];
}

interface WritingSuggestion {
  type: "orphan" | "underexplored" | "hot_topic" | "stale" | "connection";
  title: string;
  description: string;
  relatedNotes: string[];
  tags: string[];
  priority: number;
}

interface InsightsData {
  insights: {
    observation: string;
    tags: string[];
    importance: number;
  }[];
}

interface MorningBriefingProps {
  recentNotes: string[];
  onSelectNote: (path: string) => void;
  onCreateNote: () => void;
  onDailyNote: () => void;
  onOpenBrainDump: () => void;
  onOpenClipRemix: () => void;
  onOpenWritingCoach: () => void;
  onOpenSettings?: () => void;
  onOpenChat?: () => void;
  onOpenQuickCapture?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): { text: string; subtext: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12)
    return {
      text: "Good morning",
      subtext: "Here's what I've been thinking about...",
      Icon: Sun,
    };
  if (hour < 18)
    return {
      text: "Good afternoon",
      subtext: "I've noticed some patterns since we last talked...",
      Icon: Sunset,
    };
  return {
    text: "Good evening",
    subtext: "I've been connecting some dots for you...",
    Icon: Moon,
  };
}

/** Extract top themes from briefing memories + drift as counted chips. */
function extractThemes(
  briefing: BriefingData | null
): { topic: string; count: number }[] {
  if (!briefing) return [];

  const counts = new Map<string, number>();

  // Count tags from recent memories
  for (const mem of briefing.recentMemories) {
    for (const tag of mem.tags) {
      const t = tag.toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  // Count tags from insights
  for (const insight of briefing.insights) {
    for (const tag of insight.tags) {
      const t = tag.toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  // Boost new drift topics
  if (briefing.drift) {
    for (const topic of briefing.drift.newTopics) {
      const t = topic.toLowerCase();
      counts.set(t, (counts.get(t) || 0) + 2);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MorningBriefing({
  recentNotes,
  onSelectNote,
  onCreateNote,
  onOpenBrainDump,
  onOpenClipRemix,
  onOpenWritingCoach,
  onOpenSettings,
  onOpenChat,
  onOpenQuickCapture,
}: MorningBriefingProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<WritingSuggestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasProvider = !!getActiveProvider(loadSettings());

  const fetchData = useCallback(async () => {
    const results = await Promise.allSettled([
      fetch("/api/briefing").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/memory/insights?limit=3").then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/notes/writing-coach").then((r) =>
        r.ok ? r.json() : null
      ),
    ]);

    const briefingResult =
      results[0].status === "fulfilled" ? results[0].value : null;
    const insightsResult: InsightsData | null =
      results[1].status === "fulfilled" ? results[1].value : null;
    const coachResult =
      results[2].status === "fulfilled" ? results[2].value : null;

    if (briefingResult) setBriefing(briefingResult);

    // Pick the single best insight
    if (insightsResult?.insights?.length) {
      setInsight(insightsResult.insights[0].observation);
    } else if (briefingResult?.insights?.length) {
      setInsight(briefingResult.insights[0].observation);
    }

    // Worth Revisiting: pick stale/connection suggestions that reference actual notes
    if (coachResult?.suggestions) {
      const revisit = (coachResult.suggestions as WritingSuggestion[])
        .filter(
          (s) =>
            (s.type === "stale" || s.type === "connection" || s.type === "hot_topic") &&
            s.relatedNotes.length > 0
        )
        .slice(0, 3);
      setSuggestions(revisit);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const { text: greeting, subtext, Icon: GreetingIcon } = getGreeting();
  const themes = extractThemes(briefing);

  /* ---- Loading skeleton ---- */
  if (!loaded) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="space-y-8">
          {/* Greeting skeleton */}
          <div className="space-y-3">
            <div className="h-7 w-64 rounded-lg bg-card-bg animate-pulse" />
            <div className="h-4 w-80 rounded bg-card-bg animate-pulse" />
          </div>
          {/* Themes skeleton */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-7 w-24 rounded-full bg-card-bg animate-pulse"
              />
            ))}
          </div>
          {/* Cards skeleton */}
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-card-bg animate-pulse"
              />
            ))}
          </div>
          {/* Actions skeleton */}
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-xl bg-card-bg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
      {/* ============================================================= */}
      {/*  1. Companion Greeting                                        */}
      {/* ============================================================= */}
      <div className="ghost-fade-in" style={{ animationDelay: "80ms" }}>
        <div className="flex items-start gap-3">
          <GreetingIcon
            size={22}
            className="text-amber-400 mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground leading-tight">
              {greeting}.
            </h2>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">
              {insight ? insight : subtext}
            </p>
            {!insight && !briefing && (
              <p className="text-sm text-muted/60 mt-1 italic">
                I&apos;m here whenever you&apos;re ready.
              </p>
            )}
          </div>
        </div>

        {/* Subtle refresh */}
        <div className="flex justify-end mt-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[10px] text-muted/40 hover:text-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw
              size={10}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* AI Setup Prompt */}
      {!hasProvider && onOpenSettings && (
        <div
          className="ghost-fade-in rounded-xl border border-accent/30 bg-accent/5 p-4"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground mb-1">
                Set up AI to unlock your vault&apos;s full potential
              </h3>
              <p className="text-xs text-muted leading-relaxed mb-3">
                Add an AI provider to use Brain Dump, Clip &amp; Remix, AI chat,
                Ghost Connections, and more. Bring your own API key — works with
                OpenAI, Anthropic, Ollama, and 10+ providers.
              </p>
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Settings size={12} />
                Configure AI Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  2. On Your Mind — theme chips                                */}
      {/* ============================================================= */}
      {themes.length > 0 && (
        <div
          className="ghost-fade-in"
          style={{ animationDelay: "160ms" }}
        >
          <h3 className="text-[11px] uppercase tracking-wider text-muted/50 font-medium mb-3">
            On Your Mind
          </h3>
          <div className="flex flex-wrap gap-2">
            {themes.map(({ topic, count }) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent/8 text-accent/80 border border-accent/15"
              >
                {topic}
                <span className="text-[10px] text-accent/40 font-normal">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  3. Worth Revisiting — connected notes                        */}
      {/* ============================================================= */}
      {suggestions.length > 0 && (
        <div
          className="ghost-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <h3 className="text-[11px] uppercase tracking-wider text-muted/50 font-medium mb-3">
            Worth Revisiting
          </h3>
          <div className="space-y-2.5">
            {suggestions.map((s, i) => {
              const notePath = s.relatedNotes[0];
              const noteName = notePath ? notePath.split("/").pop() || notePath : "";
              return (
                <button
                  key={i}
                  onClick={() => notePath && onSelectNote(notePath)}
                  className="w-full text-left rounded-xl border border-sidebar-border/60 bg-card-bg/50 p-4 hover:border-accent/30 hover:bg-card-bg/80 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileText
                          size={13}
                          className="text-accent/40 group-hover:text-accent shrink-0 transition-colors"
                        />
                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground truncate transition-colors">
                          {noteName}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed line-clamp-2 pl-5">
                        {s.description}
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-muted/30 group-hover:text-accent shrink-0 mt-1 transition-colors"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/*  4. Quick Actions — companion language                        */}
      {/* ============================================================= */}
      <div
        className="ghost-fade-in"
        style={{ animationDelay: "320ms" }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={onOpenQuickCapture || onOpenBrainDump}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card-bg/60 border border-sidebar-border/50 hover:border-accent/30 hover:bg-card-bg transition-all group"
          >
            <Mic
              size={16}
              className="text-purple-400/60 group-hover:text-purple-400 transition-colors shrink-0"
            />
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">
              Tell me something
            </span>
          </button>

          <button
            onClick={onOpenBrainDump}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card-bg/60 border border-sidebar-border/50 hover:border-accent/30 hover:bg-card-bg transition-all group"
          >
            <Sparkles
              size={16}
              className="text-amber-400/60 group-hover:text-amber-400 transition-colors shrink-0"
            />
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">
              What&apos;s on your mind?
            </span>
          </button>

          <button
            onClick={onOpenChat || onOpenClipRemix}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card-bg/60 border border-sidebar-border/50 hover:border-accent/30 hover:bg-card-bg transition-all group"
          >
            <MessageCircle
              size={16}
              className="text-cyan-400/60 group-hover:text-cyan-400 transition-colors shrink-0"
            />
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">
              Let&apos;s chat
            </span>
          </button>

          <button
            onClick={onCreateNote}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card-bg/60 border border-sidebar-border/50 hover:border-accent/30 hover:bg-card-bg transition-all group"
          >
            <PenLine
              size={16}
              className="text-emerald-400/60 group-hover:text-emerald-400 transition-colors shrink-0"
            />
            <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors">
              Start writing
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/*  Vault Pulse (footer)                                         */}
      {/* ============================================================= */}
      {briefing && (briefing.memoryCount > 0 || briefing.noteCount > 0) && (
        <div
          className="flex items-center justify-center gap-3 pt-2 text-[11px] text-muted/30 ghost-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          {briefing.memoryCount > 0 && (
            <span>
              {briefing.memoryCount}{" "}
              {briefing.memoryCount === 1 ? "memory" : "memories"}
            </span>
          )}
          {briefing.memoryCount > 0 && briefing.noteCount > 0 && (
            <span>&middot;</span>
          )}
          {briefing.noteCount > 0 && (
            <span>
              {briefing.noteCount}{" "}
              {briefing.noteCount === 1 ? "note" : "notes"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
