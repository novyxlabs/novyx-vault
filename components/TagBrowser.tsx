"use client";

import { useState, useEffect } from "react";
import { X, Hash, FileText, ChevronDown } from "lucide-react";

interface TagInfo {
  tag: string;
  count: number;
  notes: { path: string; name: string }[];
}

interface TagBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (path: string) => void;
}

export default function TagBrowser({ isOpen, onClose, onSelectNote }: TagBrowserProps) {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/notes/tags")
      .then((r) => r.json())
      .then((data) => {
        setTags(data.tags || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = search
    ? tags.filter((t) => t.tag.toLowerCase().includes(search.toLowerCase()))
    : tags;

  const totalTags = tags.length;
  const maxCount = tags.length > 0 ? tags[0].count : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Hash size={18} className="text-accent" />
            <h2 className="text-base font-semibold">Tags</h2>
            <span className="text-xs text-muted">({totalTags})</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted-bg text-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-2 border-b border-sidebar-border">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tags..."
            className="w-full text-sm bg-muted-bg border border-sidebar-border rounded-md px-3 py-1.5 text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-xs text-muted text-center py-8">Loading tags...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <Hash size={32} className="mx-auto text-muted/30 mb-2" />
              <p className="text-sm text-muted">
                {search ? "No matching tags" : "No tags found"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((tagInfo) => {
                const isExpanded = expandedTag === tagInfo.tag;
                const barWidth = Math.max(8, (tagInfo.count / maxCount) * 100);

                return (
                  <div key={tagInfo.tag}>
                    <button
                      onClick={() => setExpandedTag(isExpanded ? null : tagInfo.tag)}
                      className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg hover:bg-muted-bg/50 transition-colors group"
                    >
                      <ChevronDown
                        size={12}
                        className={`text-muted transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`}
                      />
                      <Hash size={12} className="text-accent shrink-0" />
                      <span className="text-sm text-foreground group-hover:text-accent transition-colors">
                        {tagInfo.tag}
                      </span>
                      <div className="flex-1 flex items-center gap-2 ml-2">
                        <div className="flex-1 h-1 bg-muted-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/40 rounded-full"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted tabular-nums shrink-0">
                          {tagInfo.count}
                        </span>
                      </div>
                    </button>
                    {isExpanded && tagInfo.notes.length > 0 && (
                      <div className="ml-8 mb-1 space-y-0.5">
                        {tagInfo.notes.map((note) => (
                          <button
                            key={note.path}
                            onClick={() => {
                              onSelectNote(note.path.replace(/\.md$/, ""));
                              onClose();
                            }}
                            className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-muted-bg/50 transition-colors"
                          >
                            <FileText size={12} className="text-muted shrink-0" />
                            <span className="text-xs text-muted hover:text-accent transition-colors truncate">
                              {note.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
