"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, X, AlertTriangle, FileText, Folder } from "lucide-react";

interface TrashEntry {
  id: string;
  name: string;
  originalPath: string;
  deletedAt: string;
  isFolder: boolean;
}

interface TrashPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TrashPanel({ isOpen, onClose, onRestore }: TrashPanelProps) {
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes/trash");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
      setConfirmEmpty(false);
    }
  }, [isOpen, fetchTrash]);

  const handleRestore = async (id: string) => {
    try {
      await fetch("/api/notes/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", id }),
      });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      onRestore();
    } catch {
      // ignore
    }
  };

  const handlePurge = async (id: string) => {
    try {
      await fetch("/api/notes/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge", id }),
      });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      // ignore
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await fetch("/api/notes/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "empty" }),
      });
      setEntries([]);
      setConfirmEmpty(false);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg mx-4 max-h-[70vh] bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-400" />
            <span className="text-sm font-medium">Trash</span>
            {entries.length > 0 && (
              <span className="text-xs text-muted bg-muted-bg px-1.5 py-0.5 rounded">{entries.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              confirmEmpty ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-400">Delete all permanently?</span>
                  <button onClick={handleEmptyTrash} className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                    Yes
                  </button>
                  <button onClick={() => setConfirmEmpty(false)} className="text-xs px-2 py-0.5 bg-muted-bg text-muted rounded hover:text-foreground transition-colors">
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  className="text-xs text-muted hover:text-red-400 transition-colors"
                >
                  Empty trash
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted text-sm">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
              <Trash2 size={32} className="opacity-30" />
              <p className="text-sm">Trash is empty</p>
              <p className="text-xs">Deleted notes will appear here for recovery.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card-bg border border-sidebar-border group">
                  {entry.isFolder ? (
                    <Folder size={16} className="text-accent shrink-0" />
                  ) : (
                    <FileText size={16} className="text-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-xs text-muted truncate">
                      {entry.originalPath} · {timeAgo(entry.deletedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRestore(entry.id)}
                      className="p-1.5 rounded text-muted hover:text-green-400 transition-colors"
                      title="Restore"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => handlePurge(entry.id)}
                      className="p-1.5 rounded text-muted hover:text-red-400 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <AlertTriangle size={10} />
            <span>Items in trash can be restored or permanently deleted.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
