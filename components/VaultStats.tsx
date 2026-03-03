"use client";

import { useState, useEffect } from "react";
import { X, FileText, Type, Calendar, Hash, BarChart3, Flame, TrendingUp, Unlink } from "lucide-react";

interface VaultStatsProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote?: (path: string) => void;
}

interface Stats {
  noteCount: number;
  totalWords: number;
  dailyNoteCount: number;
  avgWordsPerNote: number;
  topTags: { tag: string; count: number }[];
  orphanedNotes: { name: string; path: string }[];
  orphanedCount: number;
}

function getStreakData(): { currentStreak: number; longestStreak: number; last30: boolean[] } {
  try {
    const raw = localStorage.getItem("noctivault-writing-days");
    const days: string[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().slice(0, 10);
    const daySet = new Set(days);

    // Current streak (counting back from today or yesterday)
    let currentStreak = 0;
    let d = new Date();
    if (!daySet.has(d.toISOString().slice(0, 10))) {
      d.setDate(d.getDate() - 1); // allow yesterday as current
    }
    while (daySet.has(d.toISOString().slice(0, 10))) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }

    // Longest streak
    const sorted = [...days].sort();
    let longestStreak = 0;
    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        streak++;
      } else if (diff > 1) {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
    if (sorted.length === 0) longestStreak = 0;

    // Last 30 days activity
    const last30: boolean[] = [];
    for (let i = 29; i >= 0; i--) {
      const check = new Date();
      check.setDate(check.getDate() - i);
      last30.push(daySet.has(check.toISOString().slice(0, 10)));
    }

    return { currentStreak, longestStreak, last30 };
  } catch {
    return { currentStreak: 0, longestStreak: 0, last30: Array(30).fill(false) };
  }
}

export default function VaultStats({ isOpen, onClose, onSelectNote }: VaultStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, last30: Array(30).fill(false) as boolean[] });

  useEffect(() => {
    if (!isOpen) return;
    setStreak(getStreakData());
    setLoading(true);
    fetch("/api/notes/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-accent" />
            <h2 className="text-sm font-medium">Vault Statistics</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card-bg rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted mb-1">
                    <FileText size={12} />
                    <span className="text-[10px] uppercase tracking-wider">Notes</span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{stats.noteCount.toLocaleString()}</p>
                </div>
                <div className="bg-card-bg rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted mb-1">
                    <Type size={12} />
                    <span className="text-[10px] uppercase tracking-wider">Words</span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{stats.totalWords.toLocaleString()}</p>
                </div>
                <div className="bg-card-bg rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted mb-1">
                    <Calendar size={12} />
                    <span className="text-[10px] uppercase tracking-wider">Daily Notes</span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{stats.dailyNoteCount}</p>
                </div>
                <div className="bg-card-bg rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted mb-1">
                    <BarChart3 size={12} />
                    <span className="text-[10px] uppercase tracking-wider">Avg Length</span>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{stats.avgWordsPerNote.toLocaleString()}</p>
                  <p className="text-[10px] text-muted">words/note</p>
                </div>
              </div>

              {/* Writing Streak */}
              <div>
                <div className="flex items-center gap-1.5 text-muted mb-2">
                  <Flame size={12} />
                  <span className="text-[10px] uppercase tracking-wider">Writing Streak</span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-lg font-bold tabular-nums ${streak.currentStreak > 0 ? "text-orange-400" : "text-muted"}`}>
                      {streak.currentStreak}
                    </span>
                    <span className="text-[10px] text-muted">current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-muted" />
                    <span className="text-sm font-semibold tabular-nums">{streak.longestStreak}</span>
                    <span className="text-[10px] text-muted">best</span>
                  </div>
                </div>
                <div className="flex gap-[3px]">
                  {streak.last30.map((active, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-sm ${active ? "bg-accent" : "bg-muted-bg"}`}
                      title={`${30 - i} days ago${active ? " — active" : ""}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted mt-1">Last 30 days</p>
              </div>

              {stats.topTags.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-muted mb-2">
                    <Hash size={12} />
                    <span className="text-[10px] uppercase tracking-wider">Top Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.topTags.map(({ tag, count }) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-400"
                      >
                        #{tag}
                        <span className="text-cyan-400/50">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Orphaned Notes */}
              {stats.orphanedCount > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-muted mb-2">
                    <Unlink size={12} />
                    <span className="text-[10px] uppercase tracking-wider">
                      Orphaned Notes ({stats.orphanedCount})
                    </span>
                  </div>
                  <p className="text-[10px] text-muted mb-2">Notes with no wiki-links to or from other notes</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {stats.orphanedNotes.map((note) => (
                      <button
                        key={note.path}
                        onClick={() => {
                          onSelectNote?.(note.path.replace(/\.md$/, ""));
                          onClose();
                        }}
                        className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-muted-bg transition-colors"
                      >
                        <FileText size={12} className="text-muted shrink-0" />
                        <span className="text-xs text-muted hover:text-accent truncate">{note.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-muted pt-2 border-t border-sidebar-border">
                ~{Math.max(1, Math.ceil(stats.totalWords / 200)).toLocaleString()} min total reading time
              </div>
            </div>
          ) : (
            <p className="text-center text-muted text-sm py-8">Failed to load statistics</p>
          )}
        </div>
      </div>
    </div>
  );
}
