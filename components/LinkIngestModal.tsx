"use client";

import { useState, useRef, useEffect } from "react";
import { X, Globe, Loader2, Sparkles, FileDown, FilePlus } from "lucide-react";
import { loadSettings, getActiveProvider } from "@/lib/providers";

interface LinkIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (path: string, content: string) => void;
  onInsert?: (content: string) => void;
  initialUrl?: string;
}

export default function LinkIngestModal({
  isOpen,
  onClose,
  onCreate,
  onInsert,
  initialUrl = "",
}: LinkIngestModalProps) {
  const [url, setUrl] = useState("");
  const [summarize, setSummarize] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    markdown: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteName, setNoteName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setSummarize(false);
      setIsLoading(false);
      setResult(null);
      setError(null);
      setNoteName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialUrl]);

  const settings = loadSettings();
  const activeProvider = getActiveProvider(settings);

  const handleFetch = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = { url: url.trim(), summarize };
      if (summarize && activeProvider) {
        body.provider = {
          baseURL: activeProvider.baseURL,
          apiKey: activeProvider.apiKey,
          model: activeProvider.model,
        };
      }

      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return;
      }

      setResult({ title: data.title, markdown: data.markdown });
      setNoteName(sanitizeNoteName(data.title));
    } catch (err) {
      setError((err as Error).message || "Connection failed");
    } finally {
      setIsLoading(false);
    }
  };

  const sanitizeNoteName = (title: string): string => {
    return title
      .replace(/[/\\:*?"<>|#]/g, "")
      .trim()
      .substring(0, 80);
  };

  const handleCreate = () => {
    if (!result || !noteName.trim()) return;
    onCreate(noteName.trim(), result.markdown);
    onClose();
  };

  const handleInsert = () => {
    if (!result || !onInsert) return;
    onInsert(result.markdown);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !result && !isLoading) {
      e.preventDefault();
      handleFetch();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-accent" />
            <h2 className="text-sm font-medium">Ingest Link</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* URL Input */}
          <div>
            <input
              ref={inputRef}
              type="url"
              placeholder="Paste a URL... (YouTube, X/Twitter, articles)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-accent/50"
            />
          </div>

          {/* Summarize checkbox */}
          {activeProvider && !result && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={summarize}
                onChange={(e) => setSummarize(e.target.checked)}
                className="rounded border-sidebar-border accent-accent"
              />
              <Sparkles size={14} className="text-accent" />
              <span className="text-xs text-muted">
                Summarize with AI ({activeProvider.model})
              </span>
            </label>
          )}

          {/* Fetch button */}
          {!result && (
            <button
              onClick={handleFetch}
              disabled={!url.trim() || isLoading}
              className="w-full py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Globe size={14} />
                  Fetch & Preview
                </>
              )}
            </button>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Result preview */}
          {result && (
            <>
              {/* Note name */}
              <div>
                <label className="text-xs text-muted block mb-1">
                  Note name
                </label>
                <input
                  type="text"
                  value={noteName}
                  onChange={(e) => setNoteName(e.target.value)}
                  className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent/50"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="text-xs text-muted block mb-1">
                  Preview
                </label>
                <pre className="text-xs text-muted bg-card-bg border border-sidebar-border rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                  {result.markdown}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!noteName.trim()}
                  className="flex-1 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FilePlus size={14} />
                  Create as Note
                </button>
                {onInsert && (
                  <button
                    onClick={handleInsert}
                    className="flex-1 py-2 bg-muted-bg text-foreground rounded-lg text-sm hover:bg-muted-bg/80 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown size={14} />
                    Insert into Note
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
