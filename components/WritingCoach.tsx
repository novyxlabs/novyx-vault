"use client";

import { useState, useEffect } from "react";
import {
  Lightbulb,
  X,
  Loader2,
  FileText,
  Hash,
  Link,
  PenLine,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface Suggestion {
  type: "orphan" | "underexplored" | "hot_topic" | "stale" | "connection";
  title: string;
  description: string;
  relatedNotes: string[];
  tags: string[];
  priority: number;
}

interface VaultStats {
  totalNotes: number;
  totalTags: number;
  totalMemories: number;
  orphanCount: number;
}

interface WritingCoachData {
  suggestions: Suggestion[];
  vaultStats: VaultStats;
}

interface WritingCoachProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote?: (path: string) => void;
  onCreateNote?: (title: string) => void;
}

const TYPE_CONFIG: Record<
  Suggestion["type"],
  { label: string; bg: string; text: string }
> = {
  orphan: { label: "Orphan", bg: "bg-red-400/10", text: "text-red-400" },
  underexplored: { label: "Underexplored", bg: "bg-amber-400/10", text: "text-amber-400" },
  hot_topic: { label: "Hot Topic", bg: "bg-green-400/10", text: "text-green-400" },
  stale: { label: "Stale", bg: "bg-blue-400/10", text: "text-blue-400" },
  connection: { label: "Connection", bg: "bg-purple-400/10", text: "text-purple-400" },
};

export default function WritingCoach({
  isOpen,
  onClose,
  onSelectNote,
  onCreateNote,
}: WritingCoachProps) {
  const [data, setData] = useState<WritingCoachData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fetch data when modal opens, reset on close
  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(false);
      return;
    }
    fetchData();
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  function fetchData() {
    setLoading(true);
    setError(false);
    fetch("/api/notes/writing-coach")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d: WritingCoachData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[80vh] bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-400" />
            <span className="text-sm font-medium">Writing Coach</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted text-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing your vault...</span>
              </div>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border border-sidebar-border bg-card-bg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-16 rounded-full bg-muted-bg animate-pulse" />
                    <div className="h-4 w-40 rounded bg-muted-bg animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-muted-bg/60 animate-pulse" />
                    <div className="h-3 w-3/4 rounded bg-muted-bg/60 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
              <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-foreground mb-1">
                Failed to analyze your vault
              </p>
              <p className="text-xs text-muted mb-3">
                Something went wrong while gathering suggestions.
              </p>
              <button
                onClick={fetchData}
                className="px-4 py-1.5 bg-red-400/10 text-red-400 rounded-lg text-xs hover:bg-red-400/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Data loaded */}
          {data && !loading && (
            <>
              {/* Vault Stats Bar */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-card-bg rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-0.5">
                    <FileText size={10} />
                    <span className="text-[9px] uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.vaultStats.totalNotes}
                  </p>
                </div>
                <div className="bg-card-bg rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-0.5">
                    <Hash size={10} />
                    <span className="text-[9px] uppercase tracking-wider">Tags</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.vaultStats.totalTags}
                  </p>
                </div>
                <div className="bg-card-bg rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-0.5">
                    <Sparkles size={10} />
                    <span className="text-[9px] uppercase tracking-wider">Memories</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.vaultStats.totalMemories}
                  </p>
                </div>
                <div className="bg-card-bg rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted mb-0.5">
                    <Link size={10} />
                    <span className="text-[9px] uppercase tracking-wider">Orphans</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {data.vaultStats.orphanCount}
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              {data.suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles size={24} className="text-accent mx-auto mb-3 opacity-60" />
                  <p className="text-sm text-foreground mb-1">
                    Your vault is well-connected!
                  </p>
                  <p className="text-xs text-muted">
                    Keep writing and check back later.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.suggestions.map((suggestion, i) => {
                    const config = TYPE_CONFIG[suggestion.type];
                    return (
                      <div
                        key={`${suggestion.type}-${i}`}
                        className="rounded-lg border border-sidebar-border bg-card-bg p-4 ghost-fade-in"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        {/* Type badge + Title */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.text}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-sm font-medium text-foreground truncate">
                            {suggestion.title}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-3">
                          {suggestion.description}
                        </p>

                        {/* Related notes */}
                        {suggestion.relatedNotes.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            {suggestion.relatedNotes.map((notePath) => (
                              <button
                                key={notePath}
                                onClick={() => {
                                  onSelectNote?.(notePath.replace(/\.md$/, ""));
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-foreground transition-colors bg-accent/5 hover:bg-accent/10 px-2 py-0.5 rounded"
                              >
                                <FileText size={10} />
                                {notePath.replace(/\.md$/, "").split("/").pop()}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Tags + Action row */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {suggestion.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                          {onCreateNote && (
                            <button
                              onClick={() => {
                                onCreateNote(suggestion.title.replace(/^(Connect |Dig deeper into |Write about |Revisit |Link )"?|"$/g, "").replace(/^"|"$/g, ""));
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent/10 shrink-0 ml-2"
                            >
                              <PenLine size={10} />
                              Start Writing
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
