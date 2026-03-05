"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  X,
  History,
  FileText,
  Brain,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  Search,
} from "lucide-react";

interface NoteEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: NoteEntry[];
  modifiedAt?: string;
}

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

type TimeFilter = "week" | "month" | "all";

interface TimelineItem {
  id: string;
  type: "note" | "memory" | "insight";
  title: string;
  preview: string;
  tags: string[];
  timestamp: Date;
  importance?: number;
  path?: string; // for notes
  raw?: Memory | Insight;
}

interface ReflectTimelineProps {
  notes: NoteEntry[];
  onSelectNote: (path: string) => void;
  onClose: () => void;
}

function formatDateHeader(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / 86400000
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)
    return date.toLocaleDateString("en-US", { weekday: "long" });
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function importanceBadge(importance: number): {
  label: string;
  style: React.CSSProperties;
} {
  if (importance >= 7)
    return {
      label: `${importance}/10`,
      style: { backgroundColor: "rgba(74, 222, 128, 0.1)", color: "rgb(74, 222, 128)" },
    };
  if (importance >= 4)
    return {
      label: `${importance}/10`,
      style: { backgroundColor: "rgba(251, 191, 36, 0.1)", color: "rgb(251, 191, 36)" },
    };
  return {
    label: `${importance}/10`,
    style: { backgroundColor: "var(--card-bg)", color: "var(--muted)" },
  };
}

function filterByTime(items: TimelineItem[], filter: TimeFilter): TimelineItem[] {
  if (filter === "all") return items;
  const now = Date.now();
  const cutoff =
    filter === "week" ? now - 7 * 86400000 : now - 30 * 86400000;
  return items.filter((item) => item.timestamp.getTime() >= cutoff);
}

function flattenNotes(entries: NoteEntry[]): NoteEntry[] {
  const result: NoteEntry[] = [];
  function walk(list: NoteEntry[]) {
    for (const e of list) {
      if (!e.isFolder) result.push(e);
      if (e.children) walk(e.children);
    }
  }
  walk(entries);
  return result;
}

export default function ReflectTimeline({
  notes,
  onSelectNote,
  onClose,
}: ReflectTimelineProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [insightsGated, setInsightsGated] = useState(false);
  const hasFetched = useRef(false);

  // Activity sparkline data (last 30 days)
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [memRes, insRes] = await Promise.allSettled([
        fetch("/api/memory?limit=50"),
        fetch("/api/memory/insights?limit=30"),
      ]);

      if (memRes.status === "fulfilled" && memRes.value.ok) {
        const data = await memRes.value.json();
        setMemories(data.memories || []);
      }

      if (insRes.status === "fulfilled") {
        if (insRes.value.ok) {
          const data = await insRes.value.json();
          setInsights(data.insights || []);
        } else if (insRes.value.status === 403) {
          setInsightsGated(true);
        }
      }
    } catch {
      // Silently handle network errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Single fetch on mount
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    hasFetched.current = false;
    fetchData();
  }, [fetchData]);

  // Build unified timeline
  const allItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];

    // Notes
    const flat = flattenNotes(notes);
    for (const note of flat) {
      if (!note.modifiedAt) continue;
      const ts = new Date(note.modifiedAt);
      // Extract tags from note name (rough heuristic)
      const nameTags: string[] = [];
      const folder = note.path.includes("/")
        ? note.path.split("/")[0]
        : undefined;
      if (folder) nameTags.push(folder);

      items.push({
        id: `note-${note.path}`,
        type: "note",
        title: note.name,
        preview: note.path,
        tags: nameTags,
        timestamp: ts,
        path: note.path,
      });
    }

    // Memories
    for (const mem of memories) {
      items.push({
        id: `mem-${mem.uuid}`,
        type: "memory",
        title:
          mem.observation.length > 60
            ? mem.observation.slice(0, 60) + "..."
            : mem.observation,
        preview: mem.observation,
        tags: mem.tags.filter((t) => !t.startsWith("user:")),
        timestamp: new Date(mem.created_at),
        importance: mem.importance,
        raw: mem,
      });
    }

    // Insights
    for (const ins of insights) {
      items.push({
        id: `ins-${ins.uuid}`,
        type: "insight",
        title:
          ins.observation.length > 60
            ? ins.observation.slice(0, 60) + "..."
            : ins.observation,
        preview: ins.observation,
        tags: ins.tags.filter((t) => !t.startsWith("user:")),
        timestamp: new Date(ins.created_at),
        importance: ins.importance,
        raw: ins,
      });
    }

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return items;
  }, [notes, memories, insights]);

  // Build activity map for sparkline
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const item of allItems) {
      const key = item.timestamp.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
    }
    setActivityMap(map);
  }, [allItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let items = filterByTime(allItems, timeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.preview.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return items;
  }, [allItems, timeFilter, searchQuery]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: TimelineItem[] }[] = [];
    const seen = new Map<string, number>();
    for (const item of filteredItems) {
      const dk = dateKey(item.timestamp);
      if (seen.has(dk)) {
        groups[seen.get(dk)!].items.push(item);
      } else {
        seen.set(dk, groups.length);
        groups.push({
          key: dk,
          label: formatDateHeader(item.timestamp),
          items: [item],
        });
      }
    }
    return groups;
  }, [filteredItems]);

  // Sparkline for last 30 days
  const sparklineDays = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: activityMap[key] || 0 });
    }
    return days;
  }, [activityMap]);

  const maxActivity = useMemo(
    () => Math.max(1, ...sparklineDays.map((d) => d.count)),
    [sparklineDays]
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const typeIcon = (type: "note" | "memory" | "insight") => {
    switch (type) {
      case "note":
        return <FileText size={14} style={{ color: "var(--accent)" }} />;
      case "memory":
        return <Brain size={14} style={{ color: "rgb(192, 132, 252)" }} />;
      case "insight":
        return <Sparkles size={14} style={{ color: "rgb(251, 191, 36)" }} />;
    }
  };

  const typeLabel = (type: "note" | "memory" | "insight") => {
    switch (type) {
      case "note":
        return "Note";
      case "memory":
        return "Memory";
      case "insight":
        return "Insight";
    }
  };

  const typeDotColor = (type: "note" | "memory" | "insight") => {
    switch (type) {
      case "note":
        return "var(--accent)";
      case "memory":
        return "rgb(192, 132, 252)";
      case "insight":
        return "rgb(251, 191, 36)";
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--background)",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--sidebar-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <History size={18} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--foreground)",
              letterSpacing: "-0.01em",
            }}
          >
            Reflect
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginLeft: 4,
            }}
          >
            {filteredItems.length} entries
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--sidebar-border)",
                borderRadius: 6,
                padding: "5px 8px 5px 28px",
                fontSize: 12,
                color: "var(--foreground)",
                outline: "none",
                width: 140,
              }}
            />
          </div>

          {/* Time filter */}
          <div
            style={{
              display: "flex",
              borderRadius: 6,
              overflow: "hidden",
              border: "1px solid var(--sidebar-border)",
            }}
          >
            {(["week", "month", "all"] as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 500,
                  background:
                    timeFilter === f
                      ? "var(--accent)"
                      : "var(--card-bg)",
                  color:
                    timeFilter === f ? "#fff" : "var(--muted)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {f === "week"
                  ? "This week"
                  : f === "month"
                  ? "This month"
                  : "All time"}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              padding: 6,
              borderRadius: 6,
              border: "1px solid var(--sidebar-border)",
              background: "var(--card-bg)",
              color: "var(--muted)",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              opacity: isLoading ? 0.5 : 1,
            }}
            title="Refresh"
          >
            <RefreshCw
              size={13}
              className={isLoading ? "animate-spin" : ""}
            />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "var(--muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            title="Close Reflect"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Activity Sparkline */}
      <div
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--sidebar-border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            Activity — Last 30 days
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            height: 24,
          }}
        >
          {sparklineDays.map((day) => {
            const height = day.count > 0 ? Math.max(4, (day.count / maxActivity) * 24) : 2;
            const isToday =
              day.date === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} entries`}
                style={{
                  flex: 1,
                  height,
                  borderRadius: 2,
                  background:
                    day.count > 0
                      ? isToday
                        ? "var(--accent)"
                        : "var(--accent)"
                      : "var(--sidebar-border)",
                  opacity: day.count > 0 ? 0.3 + (day.count / maxActivity) * 0.7 : 0.2,
                  transition: "height 0.3s ease",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 24px",
        }}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 0",
            }}
          >
            <Loader2
              size={28}
              className="animate-spin"
              style={{
                color: "var(--accent)",
                marginBottom: 12,
              }}
            />
            <p
              style={{
                fontSize: 13,
                color: "var(--muted)",
              }}
            >
              Loading your timeline...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredItems.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 0",
              color: "var(--muted)",
            }}
          >
            <History
              size={48}
              style={{ opacity: 0.15, marginBottom: 12 }}
            />
            <p style={{ fontSize: 13 }}>
              {searchQuery
                ? "No entries match your filter."
                : "Nothing here yet. Notes, memories, and insights will appear as you use Novyx Vault."}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && filteredItems.length > 0 && (
          <div style={{ position: "relative" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: 15,
                top: 24,
                bottom: 0,
                width: 1,
                background: "var(--sidebar-border)",
              }}
            />

            {grouped.map((group, gi) => (
              <div
                key={group.key}
                className="ghost-fade-in"
                style={{
                  marginBottom: 24,
                  animationDelay: `${gi * 60}ms`,
                }}
              >
                {/* Date header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 31,
                      display: "flex",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        border: "2px solid var(--background)",
                        zIndex: 1,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--accent)",
                    }}
                  >
                    {group.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    ({group.items.length})
                  </span>
                </div>

                {/* Items in day */}
                <div
                  style={{
                    marginLeft: 31,
                    paddingLeft: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {group.items.map((item, ii) => {
                    const isExpanded = expandedIds.has(item.id);
                    const isClickable =
                      item.type === "note" ||
                      item.type === "memory" ||
                      item.type === "insight";

                    return (
                      <div
                        key={item.id}
                        className="ghost-fade-in"
                        style={{
                          background: "var(--card-bg)",
                          border: "1px solid var(--sidebar-border)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          cursor: isClickable ? "pointer" : "default",
                          transition: "border-color 0.15s, background 0.15s",
                          animationDelay: `${gi * 60 + ii * 40}ms`,
                        }}
                        onClick={() => {
                          if (item.type === "note" && item.path) {
                            onSelectNote(item.path);
                          } else {
                            toggleExpand(item.id);
                          }
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "color-mix(in srgb, var(--accent) 30%, transparent)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "var(--sidebar-border)";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          {/* Type dot on timeline */}
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: typeDotColor(item.type),
                              marginTop: 5,
                              flexShrink: 0,
                            }}
                          />

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {/* Header row */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              {typeIcon(item.type)}
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 500,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  color: "var(--muted)",
                                }}
                              >
                                {typeLabel(item.type)}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--muted)",
                                  opacity: 0.6,
                                  marginLeft: "auto",
                                }}
                              >
                                {formatTime(item.timestamp)}
                              </span>
                            </div>

                            {/* Content */}
                            <p
                              style={{
                                fontSize: 13,
                                color: "var(--foreground)",
                                lineHeight: 1.5,
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: isExpanded ? 999 : 2,
                                WebkitBoxOrient: "vertical",
                                margin: 0,
                              }}
                            >
                              {item.type === "note" ? item.title : item.preview}
                            </p>

                            {/* Expand indicator for long content */}
                            {item.type !== "note" &&
                              item.preview.length > 120 &&
                              !isExpanded && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginTop: 4,
                                    fontSize: 10,
                                    color: "var(--accent)",
                                    opacity: 0.7,
                                  }}
                                >
                                  <ChevronDown size={10} />
                                  <span>Show more</span>
                                </div>
                              )}

                            {/* Meta row: tags + importance */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              {item.importance !== undefined && (() => {
                                const badge = importanceBadge(item.importance);
                                return (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      ...badge.style,
                                    }}
                                  >
                                    {badge.label}
                                  </span>
                                );
                              })()}
                              {item.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: 10,
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                    background:
                                      "color-mix(in srgb, var(--accent) 10%, transparent)",
                                    color: "var(--accent)",
                                    opacity: 0.8,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--muted)",
                                  }}
                                >
                                  +{item.tags.length - 3}
                                </span>
                              )}
                              {item.type === "note" && item.path && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: "var(--muted)",
                                    opacity: 0.5,
                                  }}
                                >
                                  {item.path}
                                </span>
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
        )}

        {/* Insights gated notice */}
        {insightsGated && !isLoading && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background: "var(--card-bg)",
              border: "1px solid var(--sidebar-border)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <Sparkles size={14} style={{ color: "rgb(251, 191, 36)", flexShrink: 0 }} />
            <span>Insights require a Pro plan. Upgrade to see AI-generated insights in your timeline.</span>
          </div>
        )}
      </div>

    </div>
  );
}
