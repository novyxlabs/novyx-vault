"use client";

import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Sunset,
  FileText,
  Plus,
  CalendarDays,
  Sparkles,
  Scissors,
  Lightbulb,
  CheckSquare,
  PenLine,
} from "lucide-react";

interface TaskDue {
  text: string;
  note: string;
}

interface BriefingData {
  lastSession: string | null;
  memoryCount: number;
  noteCount: number;
  recentMemories: unknown[];
  insights: unknown[];
  drift: unknown;
  pendingTasks: number;
  tasksDue: TaskDue[];
}

interface WritingSpark {
  type: "orphan" | "underexplored" | "hot_topic" | "stale" | "connection";
  title: string;
  description: string;
}

interface MorningBriefingProps {
  recentNotes: string[];
  onSelectNote: (path: string) => void;
  onCreateNote: () => void;
  onDailyNote: () => void;
  onOpenBrainDump: () => void;
  onOpenClipRemix: () => void;
  onOpenWritingCoach: () => void;
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

function getGreeting(): { text: string; Icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", Icon: Sun };
  if (hour < 18) return { text: "Good afternoon", Icon: Sunset };
  return { text: "Good evening", Icon: Moon };
}

const SPARK_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  orphan: {
    bg: "bg-red-400/5",
    text: "text-red-400",
    border: "border-red-500/20",
  },
  underexplored: {
    bg: "bg-amber-400/5",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  hot_topic: {
    bg: "bg-green-400/5",
    text: "text-green-400",
    border: "border-green-500/20",
  },
  stale: {
    bg: "bg-blue-400/5",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  connection: {
    bg: "bg-purple-400/5",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
};

export default function MorningBriefing({
  recentNotes,
  onSelectNote,
  onCreateNote,
  onDailyNote,
  onOpenBrainDump,
  onOpenClipRemix,
  onOpenWritingCoach,
}: MorningBriefingProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [sparks, setSparks] = useState<WritingSpark[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/briefing")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/notes/writing-coach")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([briefing, coach]) => {
      if (briefing) setData(briefing);
      if (coach?.suggestions) setSparks(coach.suggestions.slice(0, 2));
      setLoaded(true);
    });
  }, []);

  const { text: greeting, Icon: GreetingIcon } = getGreeting();
  const hasTasks = data && data.pendingTasks > 0;
  const hasRecent = recentNotes.length > 0;

  if (!loaded) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8">
        <div className="space-y-5 md:space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-muted-bg animate-pulse" />
            <div className="h-5 w-56 rounded bg-muted-bg animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[68px] rounded-xl bg-card-bg animate-pulse"
              />
            ))}
          </div>
          {hasRecent && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-card-bg animate-pulse"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-5 md:space-y-6">
      {/* Greeting */}
      <div
        className="ghost-fade-in"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center gap-3">
          <GreetingIcon size={20} className="text-amber-400" />
          <h2 className="text-lg font-semibold text-foreground">
            {greeting}
          </h2>
        </div>
        {data?.lastSession && (
          <p className="text-xs text-muted mt-1 ml-8">
            Last session: {timeAgo(data.lastSession)}
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 ghost-fade-in"
        style={{ animationDelay: "160ms" }}
      >
        <button
          onClick={onCreateNote}
          className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-all"
        >
          <Plus size={18} />
          <span className="text-[11px] font-medium">New Note</span>
        </button>
        <button
          onClick={onOpenBrainDump}
          className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all"
        >
          <Sparkles size={18} />
          <span className="text-[11px] font-medium">Brain Dump</span>
        </button>
        <button
          onClick={onOpenClipRemix}
          className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all"
        >
          <Scissors size={18} />
          <span className="text-[11px] font-medium">Clip & Remix</span>
        </button>
        <button
          onClick={onDailyNote}
          className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
        >
          <CalendarDays size={18} />
          <span className="text-[11px] font-medium">Daily Note</span>
        </button>
      </div>

      {/* Continue Writing */}
      {hasRecent && (
        <div
          className="ghost-fade-in"
          style={{ animationDelay: "240ms" }}
        >
          <h3 className="text-[11px] uppercase tracking-wider text-muted/60 font-medium mb-3">
            Continue Writing
          </h3>
          <div className={`grid gap-2.5 md:gap-3 grid-cols-1 ${recentNotes.length >= 2 ? "sm:grid-cols-2" : ""} ${recentNotes.length >= 3 ? "md:grid-cols-3" : ""}`}>
            {recentNotes.slice(0, 3).map((path) => {
              const name = path.split("/").pop() || path;
              return (
                <button
                  key={path}
                  onClick={() => onSelectNote(path)}
                  className="flex items-center gap-2.5 p-3 rounded-lg bg-card-bg border border-sidebar-border hover:border-accent/40 text-left transition-all group"
                >
                  <FileText
                    size={14}
                    className="text-accent/40 group-hover:text-accent shrink-0 transition-colors"
                  />
                  <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground truncate transition-colors">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {hasTasks && data && (
        <div
          className="ghost-fade-in"
          style={{ animationDelay: "320ms" }}
        >
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <CheckSquare size={14} className="text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                Tasks ({data.pendingTasks})
              </span>
            </div>
            <ul className="space-y-1.5">
              {data.tasksDue.map((task, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground/80"
                >
                  <span className="text-emerald-500/50 mt-px shrink-0">
                    &#9744;
                  </span>
                  <span className="leading-relaxed">{task.text}</span>
                </li>
              ))}
              {data.pendingTasks > 3 && (
                <li className="text-[10px] text-muted pl-5">
                  +{data.pendingTasks - 3} more across your vault
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Writing Sparks */}
      {sparks.length > 0 && (
        <div
          className="ghost-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] uppercase tracking-wider text-muted/60 font-medium">
              Writing Sparks
            </h3>
            <button
              onClick={onOpenWritingCoach}
              className="text-[10px] text-accent hover:text-foreground transition-colors"
            >
              View all &rarr;
            </button>
          </div>
          <div className="space-y-2">
            {sparks.map((spark, i) => {
              const colors =
                SPARK_COLORS[spark.type] || SPARK_COLORS.connection;
              return (
                <div
                  key={i}
                  className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb size={12} className={colors.text} />
                        <span className="text-xs font-medium text-foreground/80 truncate">
                          {spark.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
                        {spark.description}
                      </p>
                    </div>
                    <button
                      onClick={onOpenWritingCoach}
                      className={`shrink-0 inline-flex items-center gap-1 text-[10px] ${colors.text} hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-white/5`}
                    >
                      <PenLine size={10} />
                      Write
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vault Pulse */}
      {data && (data.memoryCount > 0 || data.noteCount > 0) && (
        <div
          className="flex items-center justify-center gap-3 pt-2 text-[11px] text-muted/40 ghost-fade-in"
          style={{ animationDelay: "480ms" }}
        >
          {data.memoryCount > 0 && (
            <span>
              {data.memoryCount}{" "}
              {data.memoryCount === 1 ? "memory" : "memories"}
            </span>
          )}
          {data.memoryCount > 0 && data.noteCount > 0 && <span>&middot;</span>}
          {data.noteCount > 0 && (
            <span>
              {data.noteCount} {data.noteCount === 1 ? "note" : "notes"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
