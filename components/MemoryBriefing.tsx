"use client";

import { useState, useEffect } from "react";
import { Brain, Clock } from "lucide-react";

interface Memory {
  uuid: string;
  observation: string;
  tags: string[];
  importance: number;
  created_at: string;
}

interface ContextData {
  recent: Memory[];
  recentCount: number;
  upcoming: Memory[];
  upcomingCount: number;
  lastSessionAt: string | null;
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

export default function MemoryBriefing() {
  const [context, setContext] = useState<ContextData | null>(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/memory/context").then((r) => r.json()),
      fetch("/api/memory?limit=1").then((r) => r.json()),
    ])
      .then(([ctx, mem]) => {
        if (ctx.lastSessionAt || ctx.recentCount > 0) {
          setContext(ctx);
        }
        setMemoryCount(mem.total || 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || (!context && memoryCount === 0)) return null;

  return (
    <div className="w-full max-w-md mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-card-bg/60 border border-sidebar-border/50 rounded-xl px-5 py-4 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-accent" />
          <span className="text-xs font-medium text-accent">Memory Active</span>
          {memoryCount > 0 && (
            <span className="text-xs text-muted ml-auto">
              {memoryCount} {memoryCount === 1 ? "memory" : "memories"}
            </span>
          )}
        </div>

        {/* Last session */}
        {context?.lastSessionAt && (
          <div className="flex items-center gap-1.5 mb-3">
            <Clock size={11} className="text-muted" />
            <span className="text-xs text-muted">
              Last session: {timeAgo(context.lastSessionAt)}
            </span>
          </div>
        )}

        {/* Recent memories */}
        {context && context.recent.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs text-muted">I remember:</span>
            {context.recent.slice(0, 3).map((mem) => (
              <div
                key={mem.uuid}
                className="text-xs text-foreground/80 pl-3 border-l-2 border-accent/20 leading-relaxed"
              >
                {mem.observation.length > 100
                  ? mem.observation.slice(0, 100) + "..."
                  : mem.observation}
              </div>
            ))}
          </div>
        )}

        {/* No context but has memories */}
        {!context && memoryCount > 0 && (
          <p className="text-xs text-muted">
            I have {memoryCount} {memoryCount === 1 ? "memory" : "memories"} from our conversations.
          </p>
        )}
      </div>
    </div>
  );
}
