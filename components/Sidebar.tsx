"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Search,
  ChevronRight,
  Trash2,
  Brain,
  CalendarDays,
  Network,
  Hash,
  Download,
  Pin,
  PinOff,
  HelpCircle,
  Sun,
  Moon,
  Pencil,
  Copy,
  ArrowUpDown,
  BarChart3,
  X,
  Loader2,
  CheckSquare,
  Square,
  CheckCheck,
  TrendingUp,
  Lightbulb,
  Scissors,
  Sparkles,
  CalendarRange,
  History,
  Settings,
  LogOut,
  User,
  Gauge,
  Shield,
  ShieldCheck,
  Mic,
  ArrowUpRight,
  Github,
} from "lucide-react";
import ThemePicker, { initAccentColor } from "./ThemePicker";
import { syncSettingsToCloud } from "@/lib/providers";

const PAID_TIERS = ["starter", "pro", "enterprise"];

interface NoteEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: NoteEntry[];
  modifiedAt?: string;
}

interface TagInfo {
  tag: string;
  count: number;
}

interface SidebarProps {
  notes: NoteEntry[];
  activeNote: string | null;
  onSelectNote: (path: string) => void;
  onCreateNote: (folderPath: string) => void;
  onCreateFolder: (folderPath: string) => void;
  onDeleteNote: (path: string) => void;
  onMoveNote: (oldPath: string, newPath: string) => void;
  onDailyNote: () => void;
  onOpenGraph: () => void;
  onOpenMemory: () => void;
  onOpenHelp: () => void;
  onOpenTrash: () => void;
  onOpenStats: () => void;
  onOpenTasks: () => void;
  onOpenTags: () => void;
  onOpenThinking: () => void;
  onOpenBrainDump: () => void;
  onOpenVoiceCapture: () => void;
  onOpenWritingCoach: () => void;
  onOpenClipRemix: () => void;
  onOpenWeeklyReview: () => void;
  onOpenReflect: () => void;
  onOpenUsage: () => void;
  onOpenAuditTrail: () => void;
  onOpenRollbackHistory: () => void;
  onOpenControl: () => void;
  onOpenSettings: () => void;
  onSignOut?: () => void;
  onGoHome: () => void;
  recentNotes: string[];
  onDuplicateNote: (path: string) => void;
  pinnedNotes: string[];
  onTogglePin: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

function TreeItem({
  entry,
  depth,
  activeNote,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onMoveNote,
  onDuplicateNote,
  searchQuery,
  isPinned,
  onTogglePin,
  selectMode,
  isSelected,
  onToggleSelect,
  selectedNotes,
}: {
  entry: NoteEntry;
  depth: number;
  activeNote: string | null;
  onSelectNote: (path: string) => void;
  onCreateNote: (folderPath: string) => void;
  onCreateFolder: (folderPath: string) => void;
  onDeleteNote: (path: string) => void;
  onMoveNote: (oldPath: string, newPath: string) => void;
  onDuplicateNote: (path: string) => void;
  searchQuery: string;
  isPinned?: boolean;
  onTogglePin?: (path: string) => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (path: string) => void;
  selectedNotes?: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const dragOverTimeout = useRef<NodeJS.Timeout | null>(null);

  if (
    searchQuery &&
    !entry.isFolder &&
    !entry.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-note-path", entry.path);
    e.dataTransfer.setData("application/x-is-folder", String(entry.isFolder));
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const canAcceptDrop = (draggedPath: string, draggedIsFolder: string): boolean => {
    if (!entry.isFolder) return false;
    if (draggedPath === entry.path) return false;
    if (draggedIsFolder === "true" && entry.path.startsWith(draggedPath + "/")) return false;
    const draggedParent = draggedPath.includes("/") ? draggedPath.substring(0, draggedPath.lastIndexOf("/")) : "";
    if (draggedParent === entry.path) return false;
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    const draggedPath = e.dataTransfer.types.includes("application/x-note-path") ? "pending" : "";
    if (!draggedPath) return;

    if (entry.isFolder) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);

      if (!isOpen && !dragOverTimeout.current) {
        dragOverTimeout.current = setTimeout(() => {
          setIsOpen(true);
          dragOverTimeout.current = null;
        }, 600);
      }
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
    if (dragOverTimeout.current) {
      clearTimeout(dragOverTimeout.current);
      dragOverTimeout.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (dragOverTimeout.current) {
      clearTimeout(dragOverTimeout.current);
      dragOverTimeout.current = null;
    }

    const draggedPath = e.dataTransfer.getData("application/x-note-path");
    const draggedIsFolder = e.dataTransfer.getData("application/x-is-folder");
    if (!draggedPath || !canAcceptDrop(draggedPath, draggedIsFolder)) return;

    const itemName = draggedPath.split("/").pop()!;
    const newPath = `${entry.path}/${itemName}`;
    onMoveNote(draggedPath, newPath);
  };

  const startRename = () => {
    setRenameValue(entry.name);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== entry.name) {
      const parentPath = entry.path.includes("/")
        ? entry.path.substring(0, entry.path.lastIndexOf("/"))
        : "";
      const newPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
      onMoveNote(entry.path, newPath);
    }
    setIsRenaming(false);
  };

  if (entry.isFolder) {
    const filteredChildren = entry.children?.filter((child) => {
      if (!searchQuery) return true;
      if (child.isFolder) return true;
      return child.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    if (searchQuery && (!filteredChildren || filteredChildren.length === 0)) {
      return null;
    }

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-1.5 py-2 md:py-1.5 px-2 rounded-md cursor-pointer group transition-colors hover:bg-muted-bg ${
            isDragOver ? "drag-over-folder" : ""
          } ${isDragging ? "dragging" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronRight
            size={14}
            className={`text-muted transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
          />
          {isOpen ? (
            <FolderOpen size={16} className="text-accent shrink-0" />
          ) : (
            <Folder size={16} className="text-accent shrink-0" />
          )}
          <span className="text-sm truncate flex-1">{entry.name}</span>
          <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(entry.path);
              }}
              className="p-1 rounded hover:bg-zinc-700 transition-colors"
              title="New note"
            >
              <Plus size={13} className="text-muted" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(entry.path);
              }}
              className="p-1 rounded hover:bg-zinc-700 transition-colors"
              title="New folder"
            >
              <FolderPlus size={13} className="text-muted" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(entry.path);
              }}
              className="p-1 rounded hover:bg-zinc-700 transition-colors"
              title="Delete folder"
            >
              <Trash2 size={13} className="text-muted" />
            </button>
          </div>
        </div>
        {isOpen && (
          <div>
            {filteredChildren?.map((child) => (
              <TreeItem
                key={child.path}
                entry={child}
                depth={depth + 1}
                activeNote={activeNote}
                onSelectNote={onSelectNote}
                onCreateNote={onCreateNote}
                onCreateFolder={onCreateFolder}
                onDeleteNote={onDeleteNote}
                onMoveNote={onMoveNote}
                onDuplicateNote={onDuplicateNote}
                searchQuery={searchQuery}
                isPinned={isPinned}
                onTogglePin={onTogglePin}
                selectMode={selectMode}
                isSelected={selectedNotes?.has(child.path)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = activeNote === entry.path;

  return (
    <div
      draggable={!selectMode}
      onDragStart={selectMode ? undefined : handleDragStart}
      onDragEnd={selectMode ? undefined : handleDragEnd}
      className={`flex items-center gap-2 py-2 md:py-1.5 px-2 rounded-md cursor-pointer group transition-colors ${
        selectMode && isSelected
          ? "bg-accent/15 text-foreground"
          : isActive
            ? "bg-accent/15 text-foreground"
            : "hover:bg-muted-bg text-zinc-400 hover:text-foreground"
      } ${isDragging ? "dragging" : ""}`}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={() => selectMode && onToggleSelect ? onToggleSelect(entry.path) : onSelectNote(entry.path)}
    >
      {selectMode ? (
        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          isSelected ? "bg-accent border-accent" : "border-zinc-500"
        }`}>
          {isSelected && <CheckCheck size={10} className="text-white" />}
        </div>
      ) : (
        <FileText size={16} className={`shrink-0 ${isActive ? "text-accent" : ""}`} />
      )}
      {isRenaming ? (
        <input
          ref={renameInputRef}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submitRename(); }
            if (e.key === "Escape") setIsRenaming(false);
          }}
          onBlur={submitRename}
          onClick={(e) => e.stopPropagation()}
          className="text-sm bg-muted-bg border border-accent rounded px-1 py-0 flex-1 min-w-0 focus:outline-none text-foreground"
        />
      ) : (
        <span
          className="text-sm truncate flex-1"
          onDoubleClick={(e) => { e.stopPropagation(); startRename(); }}
        >
          {entry.name}
        </span>
      )}
      <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(entry.path);
            }}
            className={`p-1 rounded hover:bg-zinc-700 transition-colors ${isPinned ? "opacity-100 text-accent" : ""}`}
            title={isPinned ? "Unpin" : "Pin"}
          >
            {isPinned ? <PinOff size={13} /> : <Pin size={13} className="text-muted" />}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); startRename(); }}
          className="p-1 rounded hover:bg-zinc-700 transition-colors"
          title="Rename"
        >
          <Pencil size={13} className="text-muted" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicateNote(entry.path); }}
          className="p-1 rounded hover:bg-zinc-700 transition-colors"
          title="Duplicate"
        >
          <Copy size={13} className="text-muted" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNote(entry.path);
          }}
          className="p-1 rounded hover:bg-zinc-700"
          title="Delete note"
        >
          <Trash2 size={13} className="text-muted" />
        </button>
      </div>
    </div>
  );
}

function sortNotes(entries: NoteEntry[], sortBy: string): NoteEntry[] {
  if (sortBy === "default") return entries;
  const sorted = [...entries].sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "modified-new") {
      const aTime = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
      const bTime = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
      return bTime - aTime;
    }
    if (sortBy === "modified-old") {
      const aTime = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
      const bTime = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
      return aTime - bTime;
    }
    return 0;
  });
  return sorted.map((e) =>
    e.isFolder && e.children ? { ...e, children: sortNotes(e.children, sortBy) } : e
  );
}

function countNotes(entries: NoteEntry[]): number {
  let c = 0;
  for (const e of entries) {
    if (e.isFolder && e.children) c += countNotes(e.children);
    else if (!e.isFolder) c++;
  }
  return c;
}

const SORT_OPTIONS = [
  { key: "default", label: "Default" },
  { key: "name-asc", label: "A → Z" },
  { key: "name-desc", label: "Z → A" },
  { key: "modified-new", label: "Newest" },
  { key: "modified-old", label: "Oldest" },
];

export default function Sidebar({
  notes,
  activeNote,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onMoveNote,
  onDailyNote,
  onOpenGraph,
  onOpenMemory,
  onOpenHelp,
  onOpenTrash,
  onOpenStats,
  onOpenTasks,
  onOpenTags,
  onOpenThinking,
  onOpenBrainDump,
  onOpenVoiceCapture,
  onOpenWritingCoach,
  onOpenClipRemix,
  onOpenWeeklyReview,
  onOpenReflect,
  onOpenUsage,
  onOpenAuditTrail,
  onOpenRollbackHistory,
  onOpenControl,
  onOpenSettings,
  onSignOut,
  onGoHome,
  recentNotes,
  onDuplicateNote,
  pinnedNotes,
  onTogglePin,
  isOpen,
  onClose,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ name: string; path: string; snippet: string; matchStart: number; matchEnd: number }[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sortBy, setSortBy] = useState<string>("default");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [userTier, setUserTier] = useState<string>("free");

  useEffect(() => {
    fetch("/api/memory/usage")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const t = data.gating?.tier || data.usage?.tier || "free";
        setUserTier(t);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR mismatch
    const storedTheme = localStorage.getItem("noctivault-theme") as "dark" | "light" | null;
    if (storedTheme) setTheme(storedTheme);
    const storedSort = localStorage.getItem("noctivault-sort");
    if (storedSort) setSortBy(storedSort);
    initAccentColor();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("noctivault-theme", theme);
    syncSettingsToCloud().catch(() => {});
  }, [theme]);

  useEffect(() => {
    fetch("/api/memory?limit=1")
      .then((r) => r.json())
      .then((d) => setMemoryCount(d.total ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/notes/tags")
      .then((res) => res.json())
      .then((data) => setTags(data.tags || []))
      .catch(() => {});
  }, [notes]);

  // Close user menu on outside click
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isUserMenuOpen]);

  // Debounced full-text search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      fetch(`/api/notes/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((r) => r.json())
        .then((data) => {
          setSearchResults(data.results || []);
          setIsSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setIsSearching(false);
        });
    }, 250);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  const handleSelectNoteAndClear = (path: string) => {
    onSelectNote(path);
    if (searchQuery) setSearchQuery("");
  };

  const toggleSelectNote = (path: string) => {
    setSelectedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedNotes.size === 0) return;
    for (const p of selectedNotes) {
      onDeleteNote(p);
    }
    setSelectedNotes(new Set());
    setSelectMode(false);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedNotes(new Set());
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-note-path")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsRootDragOver(true);
    }
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return;
    }
    setIsRootDragOver(false);
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);

    const draggedPath = e.dataTransfer.getData("application/x-note-path");
    if (!draggedPath) return;

    if (!draggedPath.includes("/")) return;

    const itemName = draggedPath.split("/").pop()!;
    onMoveNote(draggedPath, itemName);
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-sidebar-bg border-r border-sidebar-border flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:static md:translate-x-0 md:w-64 md:shrink-0 md:z-auto
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { onGoHome(); onClose(); }}
              className="flex items-center gap-2 flex-1 min-w-0 group"
              title="Home"
            >
              <Brain size={22} className="text-accent group-hover:scale-110 transition-transform" />
              <h1 className="text-base font-semibold tracking-tight truncate">Novyx Vault</h1>
            </button>
            <button
              onClick={onOpenGraph}
              className="p-1.5 rounded text-muted hover:text-accent transition-colors"
              title="Graph view"
            >
              <Network size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted-bg border-none rounded-md py-1.5 pl-8 pr-8 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-3 py-2 flex gap-1">
          <button
            onClick={() => onCreateNote("")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-accent/15 text-accent hover:bg-accent/25 transition-colors flex-1 justify-center"
          >
            <Plus size={14} />
            Note
          </button>
          <button
            onClick={() => onCreateFolder("")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-muted-bg text-muted hover:text-foreground transition-colors flex-1 justify-center"
          >
            <FolderPlus size={14} />
            Folder
          </button>
          <button
            onClick={onDailyNote}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-muted-bg text-muted hover:text-foreground transition-colors flex-1 justify-center"
            title="Open today's daily note"
          >
            <CalendarDays size={14} />
            Today
          </button>
        </div>

        {/* Full-text search results */}
        {searchResults !== null ? (
          <div className="flex-1 overflow-y-auto px-2 py-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {isSearching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}
              </span>
              {isSearching && <Loader2 size={10} className="text-accent animate-spin" />}
            </div>
            {searchResults.length === 0 && !isSearching && (
              <div className="text-center text-muted text-xs mt-6 px-4">
                <p>No matches found</p>
                <p className="mt-1 text-[11px]">Try different keywords</p>
              </div>
            )}
            {searchResults.map((result) => {
              const folder = result.path.includes("/") ? result.path.split("/").slice(0, -1).join("/") : null;
              const isActive = activeNote === result.path;
              // Highlight the match in the snippet
              const before = result.snippet.slice(0, result.matchStart);
              const match = result.snippet.slice(result.matchStart, result.matchEnd);
              const after = result.snippet.slice(result.matchEnd);

              return (
                <button
                  key={result.path}
                  onClick={() => { onSelectNote(result.path); setSearchQuery(""); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg mb-1 transition-colors ${
                    isActive ? "bg-accent/15" : "hover:bg-muted-bg"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-accent shrink-0" />
                    <span className="text-sm font-medium truncate">{result.name}</span>
                  </div>
                  {folder && (
                    <div className="text-[10px] text-muted ml-[18px] mt-0.5 truncate">{folder}</div>
                  )}
                  <div className="text-xs text-muted mt-1 ml-[18px] line-clamp-2 leading-relaxed">
                    {before}<span className="text-accent font-medium bg-accent/10 rounded-sm px-0.5">{match}</span>{after}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
        <>
        {/* Pinned notes */}
        {pinnedNotes.length > 0 && (
          <div className="px-2 py-1 border-b border-sidebar-border">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-muted">
              <Pin size={10} />
              Pinned
            </div>
            {pinnedNotes.map((path) => {
              const name = path.split("/").pop() || path;
              const isActive = activeNote === path;
              return (
                <div
                  key={path}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer group transition-colors ${
                    isActive ? "bg-accent/15 text-foreground" : "text-zinc-400 hover:bg-muted-bg hover:text-foreground"
                  }`}
                  onClick={() => handleSelectNoteAndClear(path)}
                >
                  <Pin size={12} className="text-accent shrink-0" />
                  <span className="text-sm truncate flex-1">{name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePin(path); }}
                    className="p-0.5 rounded hover:bg-zinc-700 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    title="Unpin"
                  >
                    <PinOff size={11} className="text-muted" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* File tree */}
        <div
          className={`flex-1 overflow-y-auto px-2 py-1 ${isRootDragOver ? "drag-over-root" : ""}`}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-medium text-foreground/50">Notes</span>
              {notes.length > 0 && (
                <span className="text-[10px] text-muted/50 tabular-nums">{countNotes(notes)}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                className={`p-0.5 rounded transition-colors ${
                  selectMode ? "text-accent" : "text-muted hover:text-foreground"
                }`}
                title={selectMode ? "Exit select mode" : "Select multiple"}
              >
                <CheckSquare size={10} />
              </button>
              <button
                onClick={() => {
                  const keys = SORT_OPTIONS.map((o) => o.key);
                  const idx = keys.indexOf(sortBy);
                  const next = keys[(idx + 1) % keys.length];
                  setSortBy(next);
                  localStorage.setItem("noctivault-sort", next);
                  syncSettingsToCloud().catch(() => {});
                }}
                className="flex items-center gap-0.5 p-0.5 rounded text-muted hover:text-foreground transition-colors"
                title={`Sort: ${SORT_OPTIONS.find((o) => o.key === sortBy)?.label || "Default"}`}
              >
                <ArrowUpDown size={10} />
                {sortBy !== "default" && (
                  <span className="text-[9px]">{SORT_OPTIONS.find((o) => o.key === sortBy)?.label}</span>
                )}
              </button>
            </div>
          </div>
          {/* Bulk action bar */}
          {selectMode && selectedNotes.size > 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 mx-2 mb-1 bg-accent/10 border border-accent/20 rounded-md">
              <span className="text-xs text-accent flex-1">{selectedNotes.size} selected</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-red-400 hover:bg-red-400/10 rounded transition-colors"
                title="Delete selected"
              >
                <Trash2 size={11} />
                Delete
              </button>
              <button
                onClick={exitSelectMode}
                className="p-0.5 text-muted hover:text-foreground transition-colors"
                title="Cancel"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {notes.length === 0 ? (
            <div className="text-center text-muted text-sm mt-8 px-4">
              <p>No notes yet.</p>
              <p className="mt-1 text-xs">Create your first note to get started.</p>
            </div>
          ) : (
            sortNotes(notes, sortBy).map((entry) => (
              <TreeItem
                key={entry.path}
                entry={entry}
                depth={0}
                activeNote={activeNote}
                onSelectNote={handleSelectNoteAndClear}
                onCreateNote={onCreateNote}
                onCreateFolder={onCreateFolder}
                onDeleteNote={onDeleteNote}
                onMoveNote={onMoveNote}
                onDuplicateNote={onDuplicateNote}
                searchQuery={searchQuery}
                isPinned={pinnedNotes.includes(entry.path)}
                onTogglePin={onTogglePin}
                selectMode={selectMode}
                isSelected={selectedNotes.has(entry.path)}
                onToggleSelect={toggleSelectNote}
                selectedNotes={selectedNotes}
              />
            ))
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="border-t border-sidebar-border">
            <button
              onClick={() => setIsTagsOpen(!isTagsOpen)}
              className="flex items-center gap-1.5 w-full px-4 py-2 text-xs text-muted hover:text-foreground transition-colors"
            >
              <ChevronRight size={12} className={`transition-transform ${isTagsOpen ? "rotate-90" : ""}`} />
              <Hash size={12} />
              <span>Tags</span>
              <span className="ml-auto text-xs opacity-60">{tags.length}</span>
            </button>
            {isTagsOpen && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {tags.slice(0, 20).map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(`#${tag}`)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    #{tag}
                    <span className="text-cyan-400/50">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </>
        )}

        {/* Footer */}
        <div className="border-t border-sidebar-border">
          {/* AI Suite */}
          <div className="px-2 pt-2.5 pb-1">
            <div className="text-[9px] uppercase tracking-[0.15em] text-accent/40 font-medium px-1 mb-1.5">AI Suite</div>
            <div className="grid grid-cols-6 gap-1">
              <button
                onClick={onOpenReflect}
                className="flex flex-col items-center gap-1 py-2 rounded-lg text-teal-400/70 hover:bg-teal-400/10 hover:text-teal-400 transition-all"
                title="Reflect — chronological timeline of notes, memories & insights"
              >
                <History size={16} />
                <span className="text-[9px] leading-none font-medium">Reflect</span>
              </button>
              <button
                onClick={onOpenBrainDump}
                className="flex flex-col items-center gap-1 py-2 rounded-lg text-purple-400/70 hover:bg-purple-400/10 hover:text-purple-400 transition-all"
                title="Brain Dump — dump thoughts, AI structures them"
              >
                <Sparkles size={16} />
                <span className="text-[9px] leading-none font-medium">Dump</span>
              </button>
              <button
                onClick={onOpenVoiceCapture}
                className="flex flex-col items-center gap-1 py-2 rounded-lg text-rose-400/70 hover:bg-rose-400/10 hover:text-rose-400 transition-all"
                title="Voice Capture — record audio, auto-transcribe and structure"
              >
                <Mic size={16} />
                <span className="text-[9px] leading-none font-medium">Voice</span>
              </button>
              <button
                onClick={onOpenClipRemix}
                className="flex flex-col items-center gap-1 py-2 rounded-lg text-cyan-400/70 hover:bg-cyan-400/10 hover:text-cyan-400 transition-all"
                title="Clip & Remix — paste anything, AI rewrites in your voice"
              >
                <Scissors size={16} />
                <span className="text-[9px] leading-none font-medium">Remix</span>
              </button>
              <button
                onClick={onOpenWritingCoach}
                className="flex flex-col items-center gap-1 py-2 rounded-lg text-amber-400/70 hover:bg-amber-400/10 hover:text-amber-400 transition-all"
                title="Writing Coach — what should you write about?"
              >
                <Lightbulb size={16} />
                <span className="text-[9px] leading-none font-medium">Coach</span>
              </button>
              <button
                onClick={onOpenThinking}
                className="flex flex-col items-center gap-1 py-2 rounded-lg text-violet-400/70 hover:bg-violet-400/10 hover:text-violet-400 transition-all"
                title="How has my thinking changed?"
              >
                <TrendingUp size={16} />
                <span className="text-[9px] leading-none font-medium">Evolve</span>
              </button>
            </div>
          </div>
          {/* Novyx */}
          <div className="px-2 pb-1">
            <div className="text-[9px] uppercase tracking-[0.15em] text-muted/30 font-medium px-1 mb-1">Novyx</div>
            <button
              onClick={onOpenUsage}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-accent/60 hover:bg-accent/10 hover:text-accent transition-all text-left"
              title="Usage & limits"
            >
              <Gauge size={13} />
              <span className="text-[10px] leading-none font-medium">Usage & Limits</span>
            </button>
            {!PAID_TIERS.includes(userTier) && (
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/billing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: "pro" }),
                  });
                  const data = await res.json();
                  if (data.checkout_url) {
                    window.open(data.checkout_url, "_blank");
                  } else {
                    window.alert(data.error || "Could not start checkout. Please try again.");
                  }
                } catch (err) {
                  console.error("[Sidebar] Checkout failed:", err);
                  window.alert("Could not start checkout. Please check your connection and try again.");
                }
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-400 transition-all text-left"
              title="Upgrade to Pro"
            >
              <ArrowUpRight size={13} />
              <span className="text-[10px] leading-none font-medium">Upgrade</span>
            </button>
            )}
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/billing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tier: "pro" }),
                  });
                  const data = await res.json();
                  if (data.checkout_url) {
                    window.open(data.checkout_url, "_blank");
                  } else {
                    alert(data.error || "Could not start checkout. Please try again.");
                  }
                } catch {
                  alert("Could not connect to billing. Please try again.");
                }
              }}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-400 transition-all text-left"
              title="Upgrade to Pro"
            >
              <ArrowUpRight size={13} />
              <span className="text-[10px] leading-none font-medium">Upgrade</span>
            </button>
            <button
              onClick={onOpenAuditTrail}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-400 transition-all text-left"
              title="Audit trail"
            >
              <Shield size={13} />
              <span className="text-[10px] leading-none font-medium">Audit Trail</span>
            </button>
            <button
              onClick={onOpenRollbackHistory}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-amber-400/60 hover:bg-amber-400/10 hover:text-amber-400 transition-all text-left"
              title="Rollback history"
            >
              <History size={13} />
              <span className="text-[10px] leading-none font-medium">Rollback History</span>
            </button>
            <button
              onClick={onOpenControl}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-blue-400/60 hover:bg-blue-400/10 hover:text-blue-400 transition-all text-left"
              title="Control — governed actions"
            >
              <ShieldCheck size={13} />
              <span className="text-[10px] leading-none font-medium">Control</span>
            </button>
          </div>
          {/* Vault Tools */}
          <div className="px-2 pb-1.5">
            <div className="text-[9px] uppercase tracking-[0.15em] text-muted/30 font-medium px-1 mb-1">Tools</div>
            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={onOpenMemory}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-purple-300/60 hover:bg-purple-400/10 hover:text-purple-300 transition-all"
                title="Memory dashboard"
              >
                <Brain size={14} />
                <span className="text-[9px] leading-none">
                  {memoryCount !== null && memoryCount > 0 ? memoryCount.toLocaleString() : "Memory"}
                </span>
              </button>
              <button
                onClick={onOpenTasks}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-emerald-300/60 hover:bg-emerald-400/10 hover:text-emerald-300 transition-all"
                title="View all tasks"
              >
                <CheckSquare size={14} />
                <span className="text-[9px] leading-none">Tasks</span>
              </button>
              <button
                onClick={onOpenTags}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-cyan-300/60 hover:bg-cyan-400/10 hover:text-cyan-300 transition-all"
                title="Browse tags"
              >
                <Hash size={14} />
                <span className="text-[9px] leading-none">Tags</span>
              </button>
              <button
                onClick={onOpenStats}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-blue-300/60 hover:bg-blue-400/10 hover:text-blue-300 transition-all"
                title="Vault statistics"
              >
                <BarChart3 size={14} />
                <span className="text-[9px] leading-none">Stats</span>
              </button>
              <button
                onClick={onOpenWeeklyReview}
                className="flex flex-col items-center gap-0.5 py-1.5 rounded-md text-orange-300/60 hover:bg-orange-400/10 hover:text-orange-300 transition-all"
                title="Weekly review"
              >
                <CalendarRange size={14} />
                <span className="text-[9px] leading-none">Review</span>
              </button>
            </div>
          </div>
          {/* Bottom utilities bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-sidebar-border/50">
            <div className="flex items-center gap-0.5">
              <button
                onClick={onOpenTrash}
                className="p-1.5 rounded-md text-muted/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Trash"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = "/api/notes/export";
                  a.download = "NovyxVault-export.zip";
                  a.click();
                }}
                className="p-1.5 rounded-md text-muted/40 hover:text-green-400 hover:bg-green-400/10 transition-all"
                title="Export all notes as ZIP"
              >
                <Download size={13} />
              </button>
              <button
                onClick={onOpenHelp}
                className="p-1.5 rounded-md text-muted/40 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                title="Help & shortcuts (?)"
              >
                <HelpCircle size={13} />
              </button>
              <a
                href="https://github.com/novyxlabs/novyx-vault"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-md text-muted/40 hover:text-yellow-400 hover:bg-yellow-400/10 transition-all"
                title="Star us on GitHub"
              >
                <Github size={13} />
              </a>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-md text-muted/40 hover:text-foreground transition-all"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              <ThemePicker />
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((p) => !p)}
                  className={`p-1.5 rounded-md transition-all ${isUserMenuOpen ? "text-accent bg-accent/10" : "text-muted/40 hover:text-foreground"}`}
                  title="Account"
                >
                  <User size={13} />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-1 w-40 bg-card-bg border border-sidebar-border rounded-lg shadow-xl overflow-hidden z-50">
                    <button
                      onClick={() => { setIsUserMenuOpen(false); onOpenSettings(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted-bg/50 transition-colors"
                    >
                      <Settings size={12} />
                      Settings
                    </button>
                    {onSignOut && (
                      <button
                        onClick={() => { setIsUserMenuOpen(false); onSignOut(); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors border-t border-sidebar-border"
                      >
                        <LogOut size={12} />
                        Sign Out
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
