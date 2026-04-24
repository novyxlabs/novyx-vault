"use client";

import { useState, useEffect, useRef } from "react";
import { Zap, FileText, X } from "lucide-react";
import { buildCaptureNoteContent, buildCaptureNotePath } from "@/lib/capture";

interface QuickCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNote: (name: string, content: string) => Promise<void> | void;
}

export default function QuickCapture({ isOpen, onClose, onCreateNote }: QuickCaptureProps) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText("");
      setSaved(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);

    try {
      const title = trimmed.length > 48
        ? `${trimmed.slice(0, 48).replace(/\s+\S*$/, "")}...`
        : trimmed;
      const capturedAt = new Date();
      const name = buildCaptureNotePath("quick", title, capturedAt);
      const noteContent = buildCaptureNoteContent({
        kind: "quick",
        title,
        content: trimmed,
        capturedAt,
      });

      await onCreateNote(name, noteContent);
      setSaved(true);
      setTimeout(() => onClose(), 600);
    } catch {
      // fail silently
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] md:pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-lg mx-4 md:mx-0 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent" />
            <span className="text-xs font-medium text-foreground">Quick Capture</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="text-[10px] text-muted bg-muted-bg px-1.5 py-0.5 rounded">
              {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘" : "Ctrl"}+Enter
            </kbd>
            <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="p-3">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full bg-card-bg border border-sidebar-border rounded-lg p-3 text-sm text-foreground placeholder-muted outline-none focus:border-accent/50 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-sidebar-border">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <FileText size={11} className="text-accent" />
            <span>Captures/YYYY-MM-DD</span>
          </div>

          <button
            onClick={handleSave}
            disabled={!text.trim() || isSaving}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              saved
                ? "bg-green-500/20 text-green-400"
                : "bg-accent text-white hover:bg-accent-hover disabled:opacity-40"
            }`}
          >
            {saved ? "Saved!" : isSaving ? "Saving..." : "Capture"}
          </button>
        </div>
      </div>
    </div>
  );
}
