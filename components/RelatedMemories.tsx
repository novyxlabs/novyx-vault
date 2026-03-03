"use client";

import { useState, useEffect } from "react";
import { Brain, ChevronDown } from "lucide-react";

interface Memory {
  uuid: string;
  observation: string;
  tags: string[];
  importance: number;
  created_at: string;
}

interface RelatedMemoriesProps {
  notePath: string;
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

export default function RelatedMemories({ notePath }: RelatedMemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Use note name as search query for semantic matching
      const noteName = notePath.split("/").pop()?.replace(/\.md$/, "") || "";
      if (!noteName) return;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({ q: noteName, limit: "5" });
        const res = await fetch(`/api/memory?${params}`);
        const data = await res.json();
        if (!cancelled) {
          setMemories(data.memories || []);
        }
      } catch {
        if (!cancelled) setMemories([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [notePath]);

  if (memories.length === 0 && !isLoading) return null;

  return (
    <div className="border-t border-sidebar-border bg-sidebar-bg/30">
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <ChevronDown size={12} className={`transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
        <Brain size={12} className="text-accent" />
        <span>
          {isLoading ? "Finding related memories..." : `${memories.length} related ${memories.length === 1 ? "memory" : "memories"}`}
        </span>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-3 space-y-1.5 max-h-32 md:max-h-none overflow-y-auto">
          {memories.map((mem) => (
            <div
              key={mem.uuid}
              className="rounded-md px-3 py-2 bg-card-bg border border-sidebar-border"
            >
              <p className="text-xs text-foreground leading-relaxed line-clamp-2">
                {mem.observation}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted">{timeAgo(mem.created_at)}</span>
                {mem.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-accent/10 text-accent/60">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
