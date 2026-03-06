"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Editor, { EditorHandle } from "./Editor";
import Preview from "./Preview";
import BacklinksPanel from "./BacklinksPanel";
import HistoryPanel from "./HistoryPanel";
import GhostConnections from "./GhostConnections";
import ShareMenu from "./ShareMenu";
import { parseFrontmatter } from "@/lib/frontmatter";
import { Eye, Code, Columns, BookOpen, Upload, MessageSquare, Download, Globe, X, Brain, Check, Maximize2, Minimize2, Bold, Italic, Heading, List, ListOrdered, Quote, Code2, Minus, CheckSquare, Link, ListTree, ChevronRight, Info, Share2 } from "lucide-react";

interface NoteEditorProps {
  notePath: string;
  content: string;
  onChange: (content: string) => void;
  isSaving: boolean;
  onFileDrop?: (fileName: string, content: string) => void;
  onNavigateWikiLink?: (linkText: string) => void;
  onSelectNote?: (path: string) => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  onRestore?: (content: string) => void;
  onIngestLink?: () => void;
  onPasteUrl?: (url: string) => void;
  noteModifiedAt?: string;
}

type ViewMode = "editor" | "preview" | "split";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\[\[([^\]]+)\]\]/g, '<em style="color:#8b5cf6">$1</em>');
}

function getStats(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { words: 0, chars: 0, readTime: "0 min" };
  const words = trimmed.split(/\s+/).length;
  const chars = trimmed.length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return { words, chars, readTime: `${mins} min read` };
}

export default function NoteEditor({ notePath, content, onChange, isSaving, onFileDrop, onNavigateWikiLink, onSelectNote, onToggleChat, isChatOpen, onRestore, onIngestLink, onPasteUrl, noteModifiedAt }: NoteEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  useEffect(() => {
    if (window.innerWidth < 768) setViewMode("editor");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isDragOver, setIsDragOver] = useState(false);
  const [pastedUrl, setPastedUrl] = useState<string | null>(null);
  const [rememberState, setRememberState] = useState<"idle" | "saving" | "saved">("idle");
  const [rememberToast, setRememberToast] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    return () => { timerRefs.current.forEach(clearTimeout); };
  }, []);
  const noteName = notePath.split("/").pop()?.replace(/\.md$/, "") || "Untitled";
  const pathSegments = notePath.split("/");
  const stats = getStats(content);
  const parsed = useMemo(() => parseFrontmatter(content), [content]);
  const fm = parsed.frontmatter;
  const hasFm = Object.keys(fm).length > 0;

  const linkCount = useMemo(() => {
    const wikiLinks = content.match(/\[\[[^\]]+\]\]/g);
    const mdLinks = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    return (wikiLinks?.length || 0) + (mdLinks?.length || 0);
  }, [content]);

  const headings = useMemo(() => {
    return content.split("\n").reduce<{ level: number; text: string; line: number }[]>((acc, line, i) => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (match) {
        acc.push({ level: match[1].length, text: match[2].replace(/[#*_`]/g, "").trim(), line: i + 1 });
      }
      return acc;
    }, []);
  }, [content]);

  // Close info panel when switching notes
  useEffect(() => { setIsInfoOpen(false); setIsShareOpen(false); }, [notePath]);

  // Listen for /publish slash command
  useEffect(() => {
    const handler = () => setIsShareOpen(true);
    window.addEventListener("novyx-publish", handler);
    return () => window.removeEventListener("novyx-publish", handler);
  }, []);

  // Close info panel on outside click
  useEffect(() => {
    if (!isInfoOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setIsInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isInfoOpen]);

  const toggleFocusMode = useCallback(() => setIsFocusMode((prev) => !prev), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggleFocusMode();
      }
      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFocusMode, toggleFocusMode]);

  const handleRemember = async () => {
    if (rememberState !== "idle" || !content.trim()) return;
    setRememberState("saving");
    try {
      const summary = content.length > 500
        ? `Note "${noteName}": ${content.slice(0, 500)}`
        : `Note "${noteName}": ${content}`;
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observation: summary }),
      });
      if (res.ok) {
        setRememberState("saved");
        setRememberToast("Note saved to memory");
        timerRefs.current.push(setTimeout(() => setRememberState("idle"), 2000));
        timerRefs.current.push(setTimeout(() => setRememberToast(null), 3000));
      } else {
        setRememberState("idle");
        setRememberToast("Failed to save to memory");
        timerRefs.current.push(setTimeout(() => setRememberToast(null), 3000));
      }
    } catch {
      setRememberState("idle");
      setRememberToast("Failed to save to memory");
      timerRefs.current.push(setTimeout(() => setRememberToast(null), 3000));
    }
  };

  const handleToggleCheckbox = useCallback((checkboxIndex: number) => {
    const CHECKBOX_RE = /^(\s*-\s*\[)([ xX])(\]\s)/;
    const lines = content.split("\n");
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(CHECKBOX_RE);
      if (match) {
        if (count === checkboxIndex) {
          const current = match[2];
          const toggled = current === " " ? "x" : " ";
          lines[i] = lines[i].replace(CHECKBOX_RE, `$1${toggled}$3`);
          onChange(lines.join("\n"));
          return;
        }
        count++;
      }
    }
  }, [content, onChange]);

  const handleExportHtml = useCallback(() => {
    // Convert markdown to basic HTML with styling
    const lines = content.split("\n");
    const htmlLines: string[] = [];
    let inList = false;
    let inOrderedList = false;
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          htmlLines.push("</code></pre>");
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          htmlLines.push("<pre><code>");
        }
        continue;
      }
      if (inCodeBlock) {
        htmlLines.push(line.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        continue;
      }

      // Close lists if needed
      if (inList && !line.match(/^[-*]\s/)) { htmlLines.push("</ul>"); inList = false; }
      if (inOrderedList && !line.match(/^\d+\.\s/)) { htmlLines.push("</ol>"); inOrderedList = false; }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        htmlLines.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      } else if (line.match(/^[-*]\s\[[ xX]\]\s/)) {
        const checked = !line.match(/^[-*]\s\[ \]/);
        const text = line.replace(/^[-*]\s\[[ xX]\]\s*/, "");
        htmlLines.push(`<p style="margin:4px 0"><input type="checkbox" ${checked ? "checked" : ""} disabled> ${formatInline(text)}</p>`);
      } else if (line.match(/^[-*]\s/)) {
        if (!inList) { htmlLines.push("<ul>"); inList = true; }
        htmlLines.push(`<li>${formatInline(line.replace(/^[-*]\s/, ""))}</li>`);
      } else if (line.match(/^\d+\.\s/)) {
        if (!inOrderedList) { htmlLines.push("<ol>"); inOrderedList = true; }
        htmlLines.push(`<li>${formatInline(line.replace(/^\d+\.\s/, ""))}</li>`);
      } else if (line.startsWith("> ")) {
        htmlLines.push(`<blockquote>${formatInline(line.slice(2))}</blockquote>`);
      } else if (line.match(/^---+$/)) {
        htmlLines.push("<hr>");
      } else if (line.trim()) {
        htmlLines.push(`<p>${formatInline(line)}</p>`);
      }
    }
    if (inList) htmlLines.push("</ul>");
    if (inOrderedList) htmlLines.push("</ol>");
    if (inCodeBlock) htmlLines.push("</code></pre>");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${noteName}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1a1a1a; background: #fafafa; }
  h1 { border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
  h1, h2, h3, h4 { margin-top: 24px; }
  pre { background: #f0f0f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #8b5cf6; margin: 16px 0; padding: 8px 16px; color: #666; background: #f8f7ff; border-radius: 0 8px 8px 0; }
  a { color: #8b5cf6; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center; }
</style>
</head>
<body>
${htmlLines.join("\n")}
<div class="footer">Exported from Novyx Vault</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, noteName]);

  const handlePasteUrl = (url: string) => {
    setPastedUrl(url);
    timerRefs.current.push(setTimeout(() => setPastedUrl(null), 6000));
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only handle external file drops, not internal note moves
    if (e.dataTransfer.types.includes("application/x-note-path")) return;
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!onFileDrop) return;

    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "md" || ext === "txt" || file.type.startsWith("text/")) {
        const text = await file.text();
        const name = file.name.replace(/\.(md|txt)$/, "");
        onFileDrop(name, text);
      }
    }
  };

  if (isFocusMode) {
    return (
      <div className="fixed inset-0 z-40 bg-background flex flex-col">
        {/* Minimal focus toolbar */}
        <div className="flex items-center justify-between px-6 py-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 text-muted">
            <span className="text-xs">{noteName}</span>
            {isSaving && <span className="text-xs animate-pulse">Saving...</span>}
          </div>
          <button
            onClick={() => setIsFocusMode(false)}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
            title="Exit Focus Mode (Esc)"
          >
            <Minimize2 size={14} />
          </button>
        </div>
        {/* Centered editor */}
        <div className="flex-1 flex justify-center overflow-hidden">
          <div className="w-full max-w-2xl">
            <Editor content={content} onChange={onChange} noteTitle={noteName} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-screen relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-sidebar-border bg-sidebar-bg/50">
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <BookOpen size={16} className="text-accent shrink-0" />
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-0.5 min-w-0 text-sm">
            {pathSegments.length > 1 ? (
              pathSegments.map((seg, i) => {
                const isLast = i === pathSegments.length - 1;
                const segName = isLast ? seg.replace(/\.md$/, "") : seg;
                return (
                  <span key={i} className="flex items-center gap-0.5 min-w-0">
                    {i > 0 && <ChevronRight size={10} className="text-muted shrink-0" />}
                    {isLast ? (
                      <span className="font-medium truncate">{segName}</span>
                    ) : (
                      <button
                        onClick={() => {}}
                        className="text-muted hover:text-accent transition-colors truncate"
                      >
                        {segName}
                      </button>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="font-medium truncate">{noteName}</span>
            )}
          </div>
          {isSaving && (
            <span className="text-xs text-muted animate-pulse shrink-0">Saving...</span>
          )}
          <span className="text-[11px] text-muted tabular-nums ml-1 shrink-0">
            {stats.words.toLocaleString()} words · {stats.readTime}
          </span>
        </div>
        <div className="md:hidden flex items-center">
          {isSaving && (
            <span className="text-xs text-muted animate-pulse">Saving...</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted-bg rounded-md p-0.5">
            <button
              onClick={() => setViewMode("editor")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "editor" ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"
              }`}
              title="Editor only"
            >
              <Code size={14} />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded transition-colors hidden md:block ${
                viewMode === "split" ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"
              }`}
              title="Split view"
            >
              <Columns size={14} />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "preview" ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"
              }`}
              title="Preview only"
            >
              <Eye size={14} />
            </button>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([content], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${noteName}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="p-1.5 rounded transition-colors text-muted hover:text-foreground"
            title="Download note"
          >
            <Download size={14} />
          </button>
          <div className="relative">
            <button
              ref={shareButtonRef}
              onClick={() => setIsShareOpen((prev) => !prev)}
              className={`p-1.5 rounded transition-colors ${isShareOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"}`}
              title="Share"
            >
              <Share2 size={14} />
            </button>
            <ShareMenu
              notePath={notePath}
              content={content}
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              anchorRef={shareButtonRef}
            />
          </div>
          <div className="relative">
            <button
              onClick={handleRemember}
              disabled={rememberState === "saving"}
              className={`p-1.5 rounded transition-colors ${
                rememberState === "saved"
                  ? "text-green-400"
                  : rememberState === "saving"
                    ? "text-accent/50 animate-pulse"
                    : "text-muted hover:text-foreground"
              }`}
              title="Remember this note"
            >
              {rememberState === "saved" ? <Check size={14} /> : <Brain size={14} />}
            </button>
            {rememberToast && (
              <div className={`absolute top-full mt-1 right-0 z-30 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg border border-sidebar-border ${
                rememberToast.startsWith("Failed") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
              }`}>
                {rememberToast}
              </div>
            )}
          </div>
          {headings.length > 0 && (
            <button
              onClick={() => setIsTocOpen((prev) => !prev)}
              className={`p-1.5 rounded transition-colors hidden md:block ${
                isTocOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"
              }`}
              title="Table of Contents"
            >
              <ListTree size={14} />
            </button>
          )}
          <div className="relative" ref={infoRef}>
            <button
              onClick={() => setIsInfoOpen((prev) => !prev)}
              className={`p-1.5 rounded transition-colors hidden md:block ${
                isInfoOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"
              }`}
              title="Note info"
            >
              <Info size={14} />
            </button>
            {isInfoOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-card-bg border border-sidebar-border rounded-lg shadow-xl p-3 space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Words</span>
                  <span className="text-foreground tabular-nums">{stats.words.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Characters</span>
                  <span className="text-foreground tabular-nums">{stats.chars.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Read time</span>
                  <span className="text-foreground">{stats.readTime}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Headings</span>
                  <span className="text-foreground tabular-nums">{headings.length}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Links</span>
                  <span className="text-foreground tabular-nums">{linkCount}</span>
                </div>
                {noteModifiedAt && (
                  <>
                    <div className="border-t border-sidebar-border pt-2 flex justify-between text-muted">
                      <span>Modified</span>
                      <span className="text-foreground">{new Date(noteModifiedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-sidebar-border pt-2 flex justify-between text-muted">
                  <span>Path</span>
                  <span className="text-foreground truncate ml-2 text-right">{notePath}</span>
                </div>
                {hasFm && (
                  <>
                    <div className="border-t border-sidebar-border pt-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-accent">Frontmatter</span>
                    </div>
                    {Object.entries(fm).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-muted">
                        <span className="capitalize">{key}</span>
                        <span className="text-foreground truncate ml-2 text-right max-w-[140px]">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={toggleFocusMode}
            className="p-1.5 rounded transition-colors text-muted hover:text-foreground hidden md:block"
            title="Focus Mode (⌘⇧F)"
          >
            <Maximize2 size={14} />
          </button>
          {onToggleChat && (
            <button
              onClick={onToggleChat}
              className={`p-1.5 rounded transition-colors hidden md:block ${
                isChatOpen ? "bg-accent/20 text-accent" : "text-muted hover:text-foreground"
              }`}
              title="AI Chat"
            >
              <MessageSquare size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Formatting toolbar */}
      {(viewMode === "editor" || viewMode === "split") && (
        <div className="flex items-center gap-0.5 px-4 py-1 border-b border-sidebar-border bg-sidebar-bg/30 overflow-x-auto scrollbar-none">
          {([
            { icon: <Bold size={14} />, insert: "****", cursor: 2, title: "Bold" },
            { icon: <Italic size={14} />, insert: "**", cursor: 1, title: "Italic" },
            { icon: <Heading size={14} />, insert: "## ", cursor: 0, title: "Heading" },
            null,
            { icon: <List size={14} />, insert: "- ", cursor: 0, title: "Bullet list" },
            { icon: <ListOrdered size={14} />, insert: "1. ", cursor: 0, title: "Numbered list" },
            { icon: <CheckSquare size={14} />, insert: "- [ ] ", cursor: 0, title: "Checkbox" },
            null,
            { icon: <Quote size={14} />, insert: "> ", cursor: 0, title: "Blockquote" },
            { icon: <Code2 size={14} />, insert: "``", cursor: 1, title: "Inline code" },
            { icon: <Minus size={14} />, insert: "\n---\n", cursor: 0, title: "Divider" },
            { icon: <Link size={14} />, insert: "[text](url)", cursor: 5, title: "Link" },
          ] as (({ icon: React.ReactNode; insert: string; cursor: number; title: string }) | null)[]).map((item, i) =>
            item === null ? (
              <div key={`sep-${i}`} className="w-px h-4 bg-sidebar-border mx-0.5" />
            ) : (
              <button
                key={item.title}
                onClick={() => editorRef.current?.insertText(item.insert, item.cursor)}
                className="p-1.5 rounded text-muted hover:text-foreground hover:bg-muted-bg transition-colors"
                title={item.title}
              >
                {item.icon}
              </button>
            )
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {isTocOpen && headings.length > 0 && (
          <div className="w-48 border-r border-sidebar-border bg-sidebar-bg/50 overflow-y-auto py-2 px-1 shrink-0 hidden md:block">
            <p className="text-[10px] uppercase tracking-wider text-muted px-2 mb-1">Outline</p>
            {headings.map((h, i) => (
              <button
                key={i}
                onClick={() => editorRef.current?.scrollToLine(h.line)}
                className="w-full text-left text-xs text-muted hover:text-foreground hover:bg-muted-bg rounded px-2 py-1 truncate transition-colors"
                style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                title={h.text}
              >
                {h.text}
              </button>
            ))}
          </div>
        )}
        {(viewMode === "editor" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2 border-r border-sidebar-border" : "w-full"} overflow-hidden`}>
            <Editor ref={editorRef} content={content} onChange={onChange} onIngestLink={onIngestLink} onPasteUrl={handlePasteUrl} noteTitle={noteName} />
          </div>
        )}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} overflow-hidden bg-background`}>
            <Preview content={content} onNavigateWikiLink={onNavigateWikiLink} onToggleCheckbox={handleToggleCheckbox} />
          </div>
        )}
      </div>

      {/* Ghost Connections */}
      <GhostConnections notePath={notePath} content={content} onSelectNote={onSelectNote} />

      {/* Backlinks */}
      {onSelectNote && (
        <BacklinksPanel notePath={notePath} onSelectNote={onSelectNote} />
      )}

      {/* Version History */}
      {onRestore && (
        <HistoryPanel notePath={notePath} onRestore={onRestore} />
      )}

      {/* Paste URL banner */}
      {pastedUrl && onPasteUrl && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-card-bg border border-accent/30 rounded-lg shadow-lg px-3 py-2 text-sm animate-in">
          <Globe size={14} className="text-accent shrink-0" />
          <span className="text-muted truncate max-w-48 text-xs">{pastedUrl}</span>
          <button
            onClick={() => { setPastedUrl(null); onPasteUrl(pastedUrl); }}
            className="px-2 py-0.5 bg-accent text-white rounded text-xs hover:bg-accent-hover transition-colors shrink-0"
          >
            Ingest
          </button>
          <button
            onClick={() => setPastedUrl(null)}
            className="p-0.5 text-muted hover:text-foreground transition-colors shrink-0"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* File drop overlay */}
      {isDragOver && (
        <div className="file-drop-overlay">
          <div className="flex flex-col items-center gap-2 text-accent">
            <Upload size={32} />
            <span className="text-sm font-medium">Drop file to import</span>
            <span className="text-xs text-muted">Supports .md and .txt files</span>
          </div>
        </div>
      )}
    </div>
  );
}
