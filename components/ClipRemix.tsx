"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Scissors,
  X,
  Save,
  RefreshCw,
  FileText,
  Link,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { loadSettings, getActiveProvider } from "@/lib/providers";

interface NoteEntry {
  name: string;
  path: string;
}

interface ClipRemixProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSaved: (path: string) => void;
  notes: NoteEntry[];
  onOpenSettings?: () => void;
}

interface RemixResult {
  title: string;
  content: string;
  tags: string[];
}

type Phase = "input" | "processing" | "preview";

export default function ClipRemix({
  isOpen,
  onClose,
  onNoteSaved,
  notes,
  onOpenSettings,
}: ClipRemixProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [clipText, setClipText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [result, setResult] = useState<RemixResult | null>(null);
  const [editableTitle, setEditableTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const settings = loadSettings();
  const activeProvider = getActiveProvider(settings);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("input");
      setClipText("");
      setSourceUrl("");
      setResult(null);
      setEditableTitle("");
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Gather the 5 most recent note paths for voice sampling
  const getSampleNotePaths = useCallback((): string[] => {
    return notes.slice(0, 5).map((n) => n.path);
  }, [notes]);

  const handleRemix = async () => {
    if (clipText.trim().length < 20 || !activeProvider) return;

    setPhase("processing");
    setError(null);

    try {
      const res = await fetch("/api/notes/clip-remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipText: clipText.trim(),
          sourceUrl: sourceUrl.trim() || null,
          provider: {
            baseURL: activeProvider.baseURL,
            apiKey: activeProvider.apiKey,
            model: activeProvider.model,
          },
          sampleNotePaths: getSampleNotePaths(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setPhase("input");
        return;
      }

      setResult(data);
      setEditableTitle(data.title);
      setPhase("preview");
    } catch (err) {
      setError((err as Error).message || "Connection failed");
      setPhase("input");
    }
  };

  const handleReRemix = () => {
    setResult(null);
    setEditableTitle("");
    setPhase("input");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    if (!result || !editableTitle.trim()) return;

    const sanitizedTitle = editableTitle
      .replace(/[/\\:*?"<>|#]/g, "")
      .trim()
      .substring(0, 80);

    const notePath = `Remixes/${sanitizedTitle}`;

    // Build the full note content
    const fullContent = `# ${sanitizedTitle}\n\n${result.content}`;

    try {
      // Ensure Remixes folder exists
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "Remixes", isFolder: true }),
      });

      // Create the note
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: notePath, content: fullContent }),
      });

      onNoteSaved(notePath);
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save note");
    }
  };

  if (!isOpen) return null;

  const charCount = clipText.length;
  const canRemix = charCount >= 20 && !!activeProvider;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl mx-4 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col ghost-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-cyan-400" />
            <h2 className="text-sm font-medium">Clip & Remix</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Phase 1: Input */}
          {phase === "input" && (
            <div className="p-5 flex flex-col gap-4">
              {/* No provider warning */}
              {!activeProvider && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <Sparkles size={14} className="text-cyan-400 shrink-0" />
                  <p className="text-xs text-cyan-300 flex-1">
                    Add an AI provider to use Clip & Remix
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={() => { onClose(); onOpenSettings(); }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-cyan-500/20 text-cyan-300 rounded-md hover:bg-cyan-500/30 transition-colors shrink-0"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              )}

              {/* Low note count notice */}
              {notes.length === 0 && activeProvider && (
                <div className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 flex items-center gap-2">
                  <FileText size={14} />
                  Add more notes to improve voice matching
                </div>
              )}

              {/* Textarea */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={clipText}
                  onChange={(e) => setClipText(e.target.value)}
                  placeholder="Paste any text — article, tweet, email, quote..."
                  rows={8}
                  className="w-full bg-card-bg border border-sidebar-border rounded-lg p-4 text-sm text-foreground placeholder-muted outline-none focus:border-cyan-400/50 resize-none"
                />
                <span className="absolute bottom-3 right-3 text-[10px] text-muted tabular-nums">
                  {charCount} chars
                  {charCount > 0 && charCount < 20 && (
                    <span className="text-amber-400 ml-1">(min 20)</span>
                  )}
                </span>
              </div>

              {/* Source URL */}
              <div className="flex items-center gap-2">
                <Link size={14} className="text-muted shrink-0" />
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Source URL (optional)"
                  className="flex-1 bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted outline-none focus:border-cyan-400/50"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Remix button */}
              <button
                onClick={handleRemix}
                disabled={!canRemix}
                className="w-full py-2.5 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Scissors size={14} />
                Remix in My Voice
              </button>
            </div>
          )}

          {/* Phase 2: Processing */}
          {phase === "processing" && (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <Scissors size={32} className="text-cyan-400 animate-pulse" />
              <p className="text-sm text-muted">Remixing in your voice...</p>
            </div>
          )}

          {/* Phase 3: Preview */}
          {phase === "preview" && result && (
            <div className="p-5 flex flex-col gap-4">
              {/* Editable title */}
              <div>
                <label className="text-xs text-muted block mb-1">Title</label>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-400/50"
                />
              </div>

              {/* Side by side / stacked comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                <div>
                  <label className="text-xs text-muted block mb-1 flex items-center gap-1">
                    <FileText size={12} />
                    Original
                  </label>
                  <div className="bg-card-bg border border-sidebar-border rounded-lg p-3 max-h-64 overflow-y-auto">
                    <p className="text-xs text-muted whitespace-pre-wrap leading-relaxed">
                      {clipText}
                    </p>
                  </div>
                </div>

                {/* Remixed */}
                <div>
                  <label className="text-xs text-muted block mb-1 flex items-center gap-1">
                    <Sparkles size={12} className="text-cyan-400" />
                    Remixed
                  </label>
                  <div className="bg-card-bg border border-cyan-500/20 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {result.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {result.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted">Tags:</span>
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Source attribution */}
              {sourceUrl && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <ExternalLink size={12} />
                  <span>Source:</span>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline truncate max-w-xs"
                  >
                    {sourceUrl}
                  </a>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!editableTitle.trim()}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  Save to Vault
                </button>
                <button
                  onClick={handleReRemix}
                  className="px-4 py-2.5 bg-muted-bg text-foreground rounded-lg text-sm hover:bg-muted-bg/80 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Re-Remix
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
