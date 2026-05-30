"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface ImportFailure {
  path: string;
  error: string;
}

interface ImportResult {
  kind: "success" | "partial" | "error";
  message: string;
  failures?: ImportFailure[];
}

export function buildImportResult(data: {
  error?: string;
  imported?: number;
  failed?: number;
  total?: number;
  completed?: boolean;
  failures?: ImportFailure[];
}): ImportResult {
  if (data.error) {
    return { kind: "error", message: `Import failed: ${data.error}` };
  }

  const imported = data.imported ?? 0;
  const failed = data.failed ?? data.failures?.length ?? 0;
  const total = data.total ?? imported + failed;

  if (data.completed === false || failed > 0) {
    return {
      kind: "partial",
      message: `Partially imported ${imported} of ${total} notes. ${failed} failed.`,
      failures: data.failures,
    };
  }

  if (total === 0 && imported === 0) {
    return { kind: "success", message: "No local notes to import." };
  }

  return { kind: "success", message: `Imported ${imported} notes successfully.` };
}

export function ImportResultView({
  result,
  importing,
  onRetry,
}: {
  result: ImportResult;
  importing: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-primary,#e4e4e7)]">{result.message}</p>
      {result.kind === "partial" && result.failures && result.failures.length > 0 && (
        <ul className="max-h-24 overflow-auto space-y-1 text-xs text-[var(--text-secondary,#a1a1aa)]">
          {result.failures.slice(0, 3).map((failure) => (
            <li key={failure.path}>
              <span className="font-medium text-[var(--text-primary,#e4e4e7)]">{failure.path}</span>
              {failure.error ? `: ${failure.error}` : ""}
            </li>
          ))}
          {result.failures.length > 3 && <li>+{result.failures.length - 3} more failed</li>}
        </ul>
      )}
      {result.kind === "partial" && (
        <button
          onClick={onRetry}
          disabled={importing}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent,#6366f1)] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {importing ? "Retrying..." : "Retry"}
        </button>
      )}
    </div>
  );
}

export default function ImportPrompt() {
  const [available, setAvailable] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

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
      const importResult = buildImportResult(data);
      setResult(importResult);
      if (importResult.kind === "success") {
        setTimeout(() => setDismissed(true), 3000);
      }
    } catch {
      setResult({ kind: "error", message: "Import failed. Please try again." });
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
                <ImportResultView result={result} importing={importing} onRetry={handleImport} />
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--text-primary,#e4e4e7)] mb-1">
                    Found {noteCount} local notes
                  </p>
                  <p className="text-xs text-[var(--text-secondary,#a1a1aa)] mb-3">
                    Copy your local ~/SecondBrain notes into the hosted cloud workspace?
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
