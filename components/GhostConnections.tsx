"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { loadSettings, getActiveProvider } from "@/lib/providers";

interface GhostConnection {
  notePath: string;
  noteName: string;
  snippet: string;
  connectionType: "semantic" | "content" | "tags";
  score: number;
}

interface GhostConnectionsProps {
  notePath: string;
  content: string;
  onSelectNote?: (path: string) => void;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  semantic: { bg: "bg-purple-500/10", text: "text-purple-400", label: "semantic" },
  content: { bg: "bg-blue-500/10", text: "text-blue-400", label: "content" },
  tags: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "tags" },
};

export default function GhostConnections({ notePath, content, onSelectNote }: GhostConnectionsProps) {
  const [connections, setConnections] = useState<GhostConnection[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Phase 1: Fetch connections
  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setConnections([]);
    setExplanations({});

    async function load() {
      if (!notePath) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ path: notePath });
        const res = await fetch(`/api/notes/connections?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!cancelled) {
          setConnections(data.connections || []);
        }
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException)) {
          setConnections([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [notePath]);

  // Phase 2: Lazily fetch AI explanations one at a time
  useEffect(() => {
    if (connections.length === 0) return;

    let cancelled = false;
    const sourceSnippet = content.slice(0, 300);
    const sourceName = notePath.split("/").pop()?.replace(/\.md$/, "") || "";

    async function loadExplanations() {
      const settings = loadSettings();
      const provider = getActiveProvider(settings);
      if (!provider) return; // No AI provider — skip explanations

      for (const conn of connections) {
        if (cancelled) break;
        try {
          const res = await fetch("/api/notes/connections/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sourceNote: sourceName,
              sourceSnippet,
              targetNote: conn.noteName,
              targetSnippet: conn.snippet,
              connectionType: conn.connectionType,
              provider: {
                baseURL: provider.baseURL,
                apiKey: provider.apiKey,
                model: provider.model,
              },
            }),
          });
          const data = await res.json();
          if (!cancelled && data.explanation) {
            setExplanations((prev) => ({ ...prev, [conn.notePath]: data.explanation }));
          }
        } catch {
          // Skip failed explanations
        }
      }
    }

    loadExplanations();
    return () => { cancelled = true; };
  }, [connections, content, notePath]);

  if (connections.length === 0 && !isLoading) return null;

  return (
    <div className="border-t border-sidebar-border bg-sidebar-bg/30">
      <button
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <ChevronDown
          size={12}
          className={`transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
        />
        <Sparkles size={12} className="text-purple-400" />
        <span>
          {isLoading
            ? "Discovering connections..."
            : `${connections.length} ghost ${connections.length === 1 ? "connection" : "connections"}`}
        </span>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
          {connections.map((conn) => {
            const colors = TYPE_COLORS[conn.connectionType] || TYPE_COLORS.content;
            const explanation = explanations[conn.notePath];

            return (
              <button
                key={conn.notePath}
                onClick={() => onSelectNote?.(conn.notePath)}
                className="w-full text-left rounded-md px-3 py-2 bg-card-bg border border-sidebar-border hover:border-purple-500/30 transition-all group ghost-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground truncate group-hover:text-purple-300 transition-colors">
                    {conn.noteName}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} shrink-0`}>
                    {colors.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed line-clamp-1 mt-0.5">
                  {conn.snippet}
                </p>
                {explanation && (
                  <p className="text-[11px] text-purple-400/70 leading-relaxed mt-1 ghost-fade-in">
                    {explanation}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
