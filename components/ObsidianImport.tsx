"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Check, AlertCircle, FileArchive } from "lucide-react";

interface ImportResult {
  imported: number;
  skipped: number;
  tags: string[];
}

export default function ObsidianImport() {
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file");
      setState("error");
      return;
    }

    setState("uploading");
    setProgress("Uploading and importing...");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/notes/import-obsidian", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setState("error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileArchive size={14} className="text-accent" />
        <h3 className="text-sm font-medium text-foreground">Import from Obsidian</h3>
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Upload a .zip of your Obsidian vault. In local mode, imported markdown becomes files in ~/SecondBrain; in cloud mode, it is stored in the hosted workspace.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {state === "idle" && (
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-dashed border-sidebar-border bg-background hover:border-accent/50 hover:bg-accent/5 transition-all w-full justify-center"
        >
          <Upload size={14} className="text-muted" />
          <span className="text-muted">Choose .zip file</span>
        </button>
      )}

      {state === "uploading" && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-sidebar-border bg-background">
          <Loader2 size={14} className="animate-spin text-accent" />
          <span className="text-muted">{progress}</span>
        </div>
      )}

      {state === "done" && result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-green-500/20 bg-green-500/5">
            <Check size={14} className="text-green-400" />
            <span className="text-foreground">
              {result.imported} note{result.imported !== 1 ? "s" : ""} imported
              {result.skipped > 0 && `, ${result.skipped} skipped`}
            </span>
          </div>
          {result.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.tags.slice(0, 10).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-accent/10 text-accent"
                >
                  {tag}
                </span>
              ))}
              {result.tags.length > 10 && (
                <span className="px-2 py-0.5 text-[10px] text-muted">
                  +{result.tags.length - 10} more
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => { setState("idle"); setResult(null); }}
            className="text-xs text-accent hover:underline"
          >
            Import another
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
          <button
            onClick={() => { setState("idle"); setError(""); }}
            className="text-xs text-accent hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
