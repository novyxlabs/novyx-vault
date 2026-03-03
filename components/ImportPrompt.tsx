"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function ImportPrompt() {
  const [available, setAvailable] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notes/import")
      .then((res) => res.json())
      .then((data) => {
        if (data.available) {
          setAvailable(true);
          setNoteCount(data.noteCount || 0);
        }
      })
      .catch(() => {});
  }, []);

  if (!available || dismissed) return null;

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/notes/import", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResult(`Import failed: ${data.error}`);
      } else {
        setResult(`Imported ${data.imported} notes successfully.`);
        setTimeout(() => setDismissed(true), 3000);
      }
    } catch {
      setResult("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full">
      <div className="rounded-xl border border-[var(--border,#27272a)] bg-[var(--bg-secondary,#141417)] p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Download size={20} className="text-[var(--accent,#6366f1)] mt-0.5 shrink-0" />
            <div>
              {result ? (
                <p className="text-sm text-[var(--text-primary,#e4e4e7)]">{result}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--text-primary,#e4e4e7)] mb-1">
                    Found {noteCount} local notes
                  </p>
                  <p className="text-xs text-[var(--text-secondary,#a1a1aa)] mb-3">
                    Import your local ~/SecondBrain notes to the cloud?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent,#6366f1)] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {importing ? "Importing..." : "Import"}
                    </button>
                    <button
                      onClick={() => setDismissed(true)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border,#27272a)] text-xs text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#e4e4e7)] transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          {!result && (
            <button
              onClick={() => setDismissed(true)}
              className="text-[var(--text-secondary,#a1a1aa)] hover:text-[var(--text-primary,#e4e4e7)] transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
