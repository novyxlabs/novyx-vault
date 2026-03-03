"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Link } from "lucide-react";

interface Backlink {
  name: string;
  path: string;
  context: string;
}

interface BacklinksPanelProps {
  notePath: string;
  onSelectNote: (path: string) => void;
}

export default function BacklinksPanel({ notePath, onSelectNote }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/notes/backlinks?path=${encodeURIComponent(notePath)}`);
        const data = await res.json();
        if (!cancelled) {
          setBacklinks(data.backlinks || []);
        }
      } catch {
        if (!cancelled) setBacklinks([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [notePath]);

  if (backlinks.length === 0 && !isLoading) return null;

  return (
    <div className="border-t border-sidebar-border bg-sidebar-bg/30">
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={12} className={`transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
        <Link size={12} />
        <span>
          {isLoading ? "Finding backlinks..." : `${backlinks.length} backlink${backlinks.length === 1 ? "" : "s"}`}
        </span>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-3 space-y-1.5 max-h-32 md:max-h-none overflow-y-auto">
          {backlinks.map((bl) => (
            <button
              key={bl.path}
              onClick={() => onSelectNote(bl.path)}
              className="w-full text-left rounded-md px-3 py-2 bg-card-bg border border-sidebar-border hover:border-accent/30 transition-colors group"
            >
              <div className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                {bl.name}
              </div>
              <div className="text-xs text-muted mt-0.5 line-clamp-1 font-mono">
                {bl.context}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
