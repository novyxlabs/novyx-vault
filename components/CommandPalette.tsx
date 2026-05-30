"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import {
  Search,
  FileText,
  Brain,
  ArrowRight,
} from "lucide-react";

interface SearchResult {
  name: string;
  path: string;
  snippet: string;
  matchStart: number;
  matchEnd: number;
}

interface MemoryResult {
  uuid: string;
  observation: string;
  created_at: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (path: string) => void;
  commands: CommandAction[];
}

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  keywords?: string[];
  icon: ReactNode;
  run: () => void | Promise<void>;
}

export default function CommandPalette({ isOpen, onClose, onSelectNote, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const commandResults = commands.filter((command) => {
    if (!normalizedQuery) return true;
    const haystack = [
      command.label,
      command.description,
      ...(command.keywords || []),
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const selectableCount = commandResults.length + results.length;

  const search = useCallback(async (q: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (q.trim().length < 2) {
      setResults([]);
      setMemoryResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    try {
      const [notesRes, memRes] = await Promise.all([
        fetch(`/api/notes/search?q=${encodeURIComponent(q)}`, { signal: controller.signal }),
        fetch(`/api/memory?q=${encodeURIComponent(q)}&limit=3`, { signal: controller.signal }),
      ]);
      const notesData = await notesRes.json();
      const memData = await memRes.json();
      setResults(notesData.results || []);
      setMemoryResults(memData.memories || []);
      setSelectedIndex(0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Search failed:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setMemoryResults([]);
      setSelectedIndex(0);
      return;
    }

    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  useEffect(() => {
    const el = resultsRef.current?.querySelectorAll<HTMLElement>("[data-selectable-row='true']")[selectedIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [normalizedQuery]);

  const runCommand = async (command: CommandAction) => {
    await command.run();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(selectableCount, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + selectableCount) % Math.max(selectableCount, 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex < commandResults.length) {
          const command = commandResults[selectedIndex];
          if (command) runCommand(command);
        } else {
          const note = results[selectedIndex - commandResults.length];
          if (note) {
            onSelectNote(note.path);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "Tab": {
        const focusable = e.currentTarget.closest('[role="dialog"]')?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) break;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        break;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] md:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-xl mx-4 md:mx-0 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sidebar-border">
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, memories, and commands..."
            className="flex-1 bg-transparent text-foreground placeholder-muted outline-none text-sm"
          />
          <kbd className="text-xs text-muted bg-muted-bg px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
          {commandResults.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted font-medium bg-sidebar-bg/50 sticky top-0">
                Commands
              </div>
              {commandResults.map((command, index) => (
                <button
                  key={command.id}
                  data-selectable-row="true"
                  onClick={() => runCommand(command)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                    index === selectedIndex
                      ? "bg-accent/15"
                      : "hover:bg-muted-bg/50"
                  }`}
                >
                  <span className="text-accent shrink-0">{command.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{command.label}</span>
                    <span className="block text-xs text-muted truncate">{command.description}</span>
                  </span>
                  <ArrowRight size={14} className="text-muted shrink-0" />
                </button>
              ))}
            </>
          )}

          {query.trim().length < 2 ? (
            <div className="px-4 py-4 text-center text-muted text-xs border-t border-sidebar-border/50">
              Type at least two characters to search notes and memories.
            </div>
          ) : isLoading ? (
            <div className="px-4 py-8 text-center text-muted text-sm animate-pulse">
              Searching...
            </div>
          ) : results.length === 0 && memoryResults.length === 0 && commandResults.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted text-sm">
              No results found
            </div>
          ) : (
            <>
              {results.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted font-medium bg-sidebar-bg/50 sticky top-0">
                    Notes
                  </div>
                  {results.map((result, index) => {
                    const rowIndex = commandResults.length + index;
                    const folderPath = result.path.includes("/")
                      ? result.path.substring(0, result.path.lastIndexOf("/"))
                      : "";

                    return (
                      <button
                        key={result.path}
                        data-selectable-row="true"
                        onClick={() => onSelectNote(result.path)}
                        className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${
                          rowIndex === selectedIndex
                            ? "bg-accent/15"
                            : "hover:bg-muted-bg/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-accent shrink-0" />
                          <span className="text-sm font-medium text-foreground">{result.name}</span>
                          {folderPath && (
                            <span className="text-xs text-muted">{folderPath}</span>
                          )}
                        </div>
                        <div className="text-xs text-muted font-mono pl-[22px] line-clamp-2">
                          <HighlightedSnippet
                            snippet={result.snippet}
                            matchStart={result.matchStart}
                            matchEnd={result.matchEnd}
                          />
                        </div>
                      </button>
                    );
                  })}
                </>
              )}

              {memoryResults.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted font-medium bg-sidebar-bg/50 sticky top-0">
                    Memories
                  </div>
                  {memoryResults.map((mem) => (
                    <div
                      key={mem.uuid}
                      className="px-4 py-3 flex items-start gap-2"
                    >
                      <Brain size={14} className="text-accent/60 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                          {mem.observation}
                        </p>
                        <span className="text-[10px] text-muted">
                          {new Date(mem.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightedSnippet({ snippet, matchStart, matchEnd }: { snippet: string; matchStart: number; matchEnd: number }) {
  if (matchStart < 0 || matchEnd > snippet.length) {
    return <span>{snippet}</span>;
  }

  return (
    <span>
      {snippet.slice(0, matchStart)}
      <span className="search-highlight">{snippet.slice(matchStart, matchEnd)}</span>
      {snippet.slice(matchEnd)}
    </span>
  );
}
