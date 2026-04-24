"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Brain, Sparkles, Save, ArrowLeft, Loader2, X, FileText, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { loadSettings, getActiveProvider } from "@/lib/providers";
import { buildCaptureNoteContent, buildCaptureNotePath } from "@/lib/capture";

interface BrainDumpProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSaved: (path: string) => void;
  notes: { name: string; path: string }[];
  onOpenSettings?: () => void;
}

type Phase = "input" | "processing" | "preview";

export default function BrainDump({ isOpen, onClose, onNoteSaved, notes, onOpenSettings }: BrainDumpProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [structuredContent, setStructuredContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase("input");
      setRawText("");
      setTitle("");
      setStructuredContent("");
      setError(null);
      setIsSaving(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Get AI provider
  const getProvider = useCallback(() => {
    const settings = loadSettings();
    return getActiveProvider(settings);
  }, []);

  const provider = getProvider();

  // Extract tags from the structured content for display
  const extractedTags = structuredContent
    .match(/#[a-z][a-z0-9-]*/g)
    ?.filter((tag, i, arr) => arr.indexOf(tag) === i) || [];

  const handleStructure = async () => {
    if (!provider || rawText.trim().length < 20) return;

    setPhase("processing");
    setError(null);

    try {
      const existingNotes = notes.map((n) => n.name);

      const res = await fetch("/api/notes/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: rawText.trim(),
          provider: {
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            model: provider.model,
          },
          existingNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setPhase("input");
        return;
      }

      setTitle(data.title);
      setStructuredContent(data.content);
      setPhase("preview");
    } catch (err) {
      setError((err as Error).message || "Failed to connect to AI");
      setPhase("input");
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !structuredContent) return;

    setIsSaving(true);
    setError(null);

    try {
      const capturedAt = new Date();
      const fullContent = buildCaptureNoteContent({
        kind: "brain-dump",
        title: title.trim(),
        content: structuredContent,
        capturedAt,
      });
      const notePath = buildCaptureNotePath("brain-dump", title.trim(), capturedAt);

      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: notePath,
          content: fullContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Failed to save note`);
        setIsSaving(false);
        return;
      }

      onNoteSaved(notePath);
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save note");
      setIsSaving(false);
    }
  };

  const handleBackToEdit = () => {
    setPhase("input");
    setError(null);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Brain Dump"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Tab") {
          const modal = e.currentTarget;
          const focusable = modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
      }}
    >
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-purple-400" />
            <h2 className="text-sm font-medium">Brain Dump</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Phase 1: Input */}
          {phase === "input" && (
            <div className="ghost-fade-in flex flex-col gap-4">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Just start typing. Don't think about structure &#8212; dump everything on your mind..."
                  className="w-full min-h-[200px] max-h-[50vh] bg-card-bg border border-sidebar-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted outline-none focus:border-purple-500/50 resize-y leading-relaxed"
                />
                <span className="absolute bottom-3 right-3 text-[11px] text-muted tabular-nums">
                  {rawText.length} chars
                  {rawText.length > 0 && rawText.trim().length < 20 && (
                    <span className="text-amber-400 ml-1">(min 20)</span>
                  )}
                </span>
              </div>

              {!provider && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <Sparkles size={14} className="text-purple-400 shrink-0" />
                  <p className="text-xs text-purple-300 flex-1">
                    Add an AI provider to use Brain Dump
                  </p>
                  {onOpenSettings && (
                    <button
                      onClick={() => { onClose(); onOpenSettings(); }}
                      className="px-2.5 py-1 text-[11px] font-medium bg-purple-500/20 text-purple-300 rounded-md hover:bg-purple-500/30 transition-colors shrink-0"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted">
                  <Sparkles size={10} className="inline mr-1 relative -top-px" />
                  AI will organize your thoughts into a structured note
                </p>
                <button
                  onClick={handleStructure}
                  disabled={rawText.trim().length < 20 || !provider}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Structure with AI
                </button>
              </div>
            </div>
          )}

          {/* Phase 2: Processing */}
          {phase === "processing" && (
            <div className="ghost-fade-in flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Brain size={40} className="text-purple-400 animate-pulse" />
              </div>
              <p className="text-sm text-muted">Organizing your thoughts...</p>
            </div>
          )}

          {/* Phase 3: Preview & Save */}
          {phase === "preview" && (
            <div className="ghost-fade-in flex flex-col gap-4">
              {/* Title input */}
              <div>
                <label className="text-xs text-muted block mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-purple-500/50"
                />
              </div>

              {/* Folder input */}
              <div>
                <label className="text-xs text-muted flex items-center gap-1 mb-1.5">
                  <FolderOpen size={11} />
                  Vault Path
                </label>
                <div className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-muted font-mono text-xs">
                  Captures/YYYY-MM-DD
                </div>
              </div>

              {/* Tags */}
              {extractedTags.length > 0 && (
                <div>
                  <label className="text-xs text-muted block mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Markdown preview */}
              <div>
                <label className="text-xs text-muted flex items-center gap-1 mb-1.5">
                  <FileText size={11} />
                  Preview
                </label>
                <div className="bg-card-bg border border-sidebar-border rounded-lg p-4 max-h-[35vh] overflow-y-auto">
                  <div className="markdown-preview text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {structuredContent.replace(/(?:^|\n)(?:#{0,6}\s*)?(?:#[a-z][a-z0-9-]*[\s,]*)+$/gm, "").replace(/ #[a-z][a-z0-9-]*/g, "").trim()}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky action bar for preview phase */}
        {phase === "preview" && (
          <div className="px-5 py-3 border-t border-sidebar-border bg-sidebar-bg flex gap-2 shrink-0">
            <button
              onClick={handleBackToEdit}
              className="flex-1 py-2 bg-muted-bg text-foreground rounded-lg text-sm hover:bg-muted-bg/80 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              Back to Edit
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save to Vault
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
