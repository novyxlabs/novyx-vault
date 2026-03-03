"use client";

import { useState, useEffect, useCallback } from "react";
import { History, RotateCcw, Eye, X } from "lucide-react";

interface Version {
  timestamp: number;
  filename: string;
}

interface HistoryPanelProps {
  notePath: string;
  onRestore: (content: string) => void;
}

export default function HistoryPanel({ notePath, onRestore }: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTs, setPreviewTs] = useState<number | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/notes/history?path=${encodeURIComponent(notePath)}`);
      const data = await res.json();
      setVersions(data.versions || []);
    } catch {
      setVersions([]);
    }
  }, [notePath]);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, loadVersions]);

  // Reset when note changes
  useEffect(() => {
    setIsOpen(false);
    setPreviewContent(null);
    setPreviewTs(null);
  }, [notePath]);

  const handlePreview = async (ts: number) => {
    try {
      const res = await fetch(
        `/api/notes/history/version?path=${encodeURIComponent(notePath)}&ts=${ts}`
      );
      const data = await res.json();
      setPreviewContent(data.content || "");
      setPreviewTs(ts);
    } catch {
      setPreviewContent(null);
    }
  };

  const handleRestore = () => {
    if (previewContent !== null) {
      onRestore(previewContent);
      setIsOpen(false);
      setPreviewContent(null);
      setPreviewTs(null);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    let relative: string;
    if (mins < 1) relative = "Just now";
    else if (mins < 60) relative = `${mins}m ago`;
    else if (hours < 24) relative = `${hours}h ago`;
    else relative = `${days}d ago`;

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString([], { month: "short", day: "numeric" });

    return { relative, detail: `${date} ${time}` };
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded transition-colors text-muted hover:text-foreground"
        title="Version history"
      >
        <History size={14} />
      </button>
    );
  }

  return (
    <div className="border-t border-sidebar-border bg-sidebar-bg/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <History size={12} className="text-accent" />
          Version History
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setPreviewContent(null);
            setPreviewTs(null);
          }}
          className="p-1 rounded text-muted hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {previewContent !== null && (
        <div className="px-4 py-2 border-b border-sidebar-border bg-accent/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Preview: {previewTs && formatTime(previewTs).detail}</span>
            <button
              onClick={handleRestore}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent-hover transition-colors"
            >
              <RotateCcw size={10} />
              Restore
            </button>
          </div>
          <pre className="text-xs text-muted max-h-16 md:max-h-24 overflow-y-auto whitespace-pre-wrap font-mono">
            {previewContent.slice(0, 500)}
            {previewContent.length > 500 && "..."}
          </pre>
        </div>
      )}

      <div className="max-h-28 md:max-h-40 overflow-y-auto">
        {versions.length === 0 ? (
          <p className="text-xs text-muted px-4 py-3 text-center">No history yet</p>
        ) : (
          versions.map((v) => {
            const { relative, detail } = formatTime(v.timestamp);
            return (
              <button
                key={v.timestamp}
                onClick={() => handlePreview(v.timestamp)}
                className={`flex items-center justify-between w-full px-4 py-1.5 text-xs hover:bg-muted-bg transition-colors ${
                  previewTs === v.timestamp ? "bg-accent/10 text-accent" : "text-muted"
                }`}
              >
                <span>{relative}</span>
                <span className="text-xs opacity-60">{detail}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
