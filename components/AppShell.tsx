"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import NoteEditor from "@/components/NoteEditor";
import CommandPalette from "@/components/CommandPalette";
import ChatSidebar from "@/components/ChatSidebar";
import SettingsModal from "@/components/SettingsModal";
import GraphView from "@/components/GraphView";
import NewNoteModal from "@/components/NewNoteModal";
import LinkIngestModal from "@/components/LinkIngestModal";
import MemoryDashboard from "@/components/MemoryDashboard";
import MorningBriefing from "@/components/MorningBriefing";
import QuickCapture from "@/components/QuickCapture";
import HelpModal from "@/components/HelpModal";
import TrashPanel from "@/components/TrashPanel";
import VaultStats from "@/components/VaultStats";
import TaskView from "@/components/TaskView";
import TagBrowser from "@/components/TagBrowser";
import ThinkingEvolution from "@/components/ThinkingEvolution";
import GhostNotification from "@/components/GhostNotification";
import BrainDump from "@/components/BrainDump";
import WritingCoach from "@/components/WritingCoach";
import ClipRemix from "@/components/ClipRemix";
import WeeklyReview from "@/components/WeeklyReview";
import ReflectTimeline from "@/components/ReflectTimeline";
import UsageView from "@/components/UsageView";
import AuditTrailView from "@/components/AuditTrailView";
import RollbackHistoryView from "@/components/RollbackHistoryView";
import ControlView from "@/components/ControlView";
import MissionControl from "@/components/MissionControl";
import NovyxErrorBoundary from "@/components/NovyxErrorBoundary";
import ConfirmDialog from "@/components/ConfirmDialog";
import PromptDialog from "@/components/PromptDialog";
import ImportPrompt from "@/components/ImportPrompt";
import { resolveWikiLink } from "@/lib/wikilink";
import { loadCloudSettings, syncSettingsToCloud, clearUserLocalStorage } from "@/lib/providers";
import { Upload, Menu, Search, MessageSquare, ChevronLeft } from "lucide-react";

interface NoteEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: NoteEntry[];
  modifiedAt?: string;
}

export default function AppShell() {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEmptyDragOver, setIsEmptyDragOver] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [newNoteFolder, setNewNoteFolder] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [ingestUrl, setIngestUrl] = useState<string | null>(null);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isBrainDumpOpen, setIsBrainDumpOpen] = useState(false);
  const [isWritingCoachOpen, setIsWritingCoachOpen] = useState(false);
  const [isClipRemixOpen, setIsClipRemixOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [isReflectOpen, setIsReflectOpen] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isRollbackHistoryOpen, setIsRollbackHistoryOpen] = useState(false);
  const [isControlOpen, setIsControlOpen] = useState(false);
  const [isMissionControlOpen, setIsMissionControlOpen] = useState(false);
  const closeAllModals = useCallback(() => {
    setIsGraphOpen(false);
    setIsMemoryOpen(false);
    setIsStatsOpen(false);
    setIsTasksOpen(false);
    setIsTagsOpen(false);
    setIsThinkingOpen(false);
    setIsBrainDumpOpen(false);
    setIsWritingCoachOpen(false);
    setIsClipRemixOpen(false);
    setIsWeeklyReviewOpen(false);
    setIsReflectOpen(false);
    setIsUsageOpen(false);
    setIsAuditTrailOpen(false);
    setIsRollbackHistoryOpen(false);
    setIsControlOpen(false);
    setIsMissionControlOpen(false);
    setIsHelpOpen(false);
    setIsTrashOpen(false);
    setIsSettingsOpen(false);
  }, []);

  const [recentNotes, setRecentNotes] = useState<string[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; confirmLabel?: string; onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ message: string; defaultValue?: string; onSubmit: (v: string) => void } | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingSave = useRef<{ path: string; content: string } | null>(null);
  const lastSnapshotRef = useRef<number>(0);
  const loadedContentLenRef = useRef<number>(0);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error("Failed to load notes:", err);
    }
  }, []);

  const loadNote = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/notes?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      const noteContent = data.content || "";
      setContent(noteContent);
      loadedContentLenRef.current = noteContent.length;
    } catch (err) {
      console.error("Failed to load note:", err);
    }
  }, []);

  const flushSave = useCallback(async () => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    const pending = pendingSave.current;
    if (pending && pending.content.trim()) {
      try {
        const res = await fetch("/api/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pending.path, content: pending.content }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "Unknown error");
          throw new Error(`Save failed (${res.status}): ${msg}`);
        }
        pendingSave.current = null;
        setSaveError(null);
      } catch (err) {
        console.error("Failed to flush save:", err);
        setSaveError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    }
  }, []);

  const saveNote = useCallback(
    (path: string, newContent: string) => {
      // Prevent saving when undo wipes most of the content
      const loadedLen = loadedContentLenRef.current;
      if (loadedLen > 50 && newContent.trim().length < loadedLen * 0.2) return;
      if (!newContent.trim()) return;

      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      pendingSave.current = { path, content: newContent };
      setIsSaving(true);
      setSaveError(null);
      saveTimeout.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/notes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, content: newContent }),
          });
          if (!res.ok) {
            const msg = await res.text().catch(() => "Unknown error");
            throw new Error(`Save failed (${res.status}): ${msg}`);
          }
          pendingSave.current = null;
          setSaveError(null);
          // Record writing activity for streak tracking
          try {
            const today = new Date().toISOString().slice(0, 10);
            const raw = localStorage.getItem("noctivault-writing-days");
            const days: string[] = raw ? JSON.parse(raw) : [];
            if (!days.includes(today)) {
              days.push(today);
              // Keep last 365 days
              while (days.length > 365) days.shift();
              localStorage.setItem("noctivault-writing-days", JSON.stringify(days));
            }
          } catch {}
          // Save history snapshot every 30 seconds at most
          const now = Date.now();
          if (now - lastSnapshotRef.current > 30000) {
            lastSnapshotRef.current = now;
            fetch("/api/notes/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path, content: newContent }),
            }).catch(() => {});
          }
        } catch (err) {
          console.error("Failed to save note:", err);
          setSaveError(err instanceof Error ? err.message : "Save failed");
        } finally {
          setIsSaving(false);
        }
      }, 500);
    },
    []
  );

  // Flush pending saves on tab close / navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingSave.current) {
        // Synchronous send — navigator.sendBeacon for reliability
        const pending = pendingSave.current;
        navigator.sendBeacon(
          "/api/notes",
          new Blob(
            [JSON.stringify({ path: pending.path, content: pending.content, _method: "PUT" })],
            { type: "application/json" }
          )
        );
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    loadNotes();
    // Hydrate localStorage state after mount to avoid SSR mismatch
    try {
      setRecentNotes(JSON.parse(localStorage.getItem("noctivault-recent") || "[]"));
    } catch { /* ignore */ }
    try {
      setPinnedNotes(JSON.parse(localStorage.getItem("noctivault-pinned") || "[]"));
    } catch { /* ignore */ }
    // Load cloud settings (fills gaps in localStorage from server)
    loadCloudSettings().catch(() => {});
  }, [loadNotes]);

  useEffect(() => {
    if (activeNote) {
      loadNote(activeNote);
    }
  }, [activeNote, loadNote]);

  const handleSelectNote = async (path: string) => {
    await flushSave();
    setActiveNote(path);
    setIsSidebarOpen(false);
    setRecentNotes((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, 10);
      localStorage.setItem("noctivault-recent", JSON.stringify(next));
      return next;
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (activeNote) {
      saveNote(activeNote, newContent);
    }
  };

  const handleCreateNote = useCallback((folderPath: string) => {
    setNewNoteFolder(folderPath);
  }, []);

  const handleCreateNoteWithContent = useCallback(async (path: string, noteContent: string) => {
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: noteContent }),
      });
      await loadNotes();
      setActiveNote(path);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  }, [loadNotes]);

  const handleCreateFolder = (parentPath: string) => {
    setPromptDialog({
      message: "Folder name:",
      onSubmit: async (name) => {
        setPromptDialog(null);
        const path = parentPath ? `${parentPath}/${name}` : name;
        try {
          await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, isFolder: true }),
          });
          await loadNotes();
        } catch (err) {
          console.error("Failed to create folder:", err);
        }
      },
    });
  };

  const handleTogglePin = useCallback((path: string) => {
    setPinnedNotes((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      localStorage.setItem("noctivault-pinned", JSON.stringify(next));
      syncSettingsToCloud().catch(() => {});
      return next;
    });
  }, []);

  const handleDeleteNote = (path: string) => {
    setConfirmDialog({
      message: "Move this to trash?",
      confirmLabel: "Trash",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await fetch("/api/notes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path }),
          });
          if (activeNote === path) {
            setActiveNote(null);
            setContent("");
          }
          await loadNotes();
        } catch (err) {
          console.error("Failed to delete note:", err);
        }
      },
    });
  };

  const handleMoveNote = async (oldPath: string, newPath: string) => {
    try {
      await fetch("/api/notes/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath, newPath }),
      });
      // If we moved the active note, update its path
      if (activeNote === oldPath) {
        setActiveNote(newPath);
      } else if (activeNote && activeNote.startsWith(oldPath + "/")) {
        // Active note was inside a moved folder
        setActiveNote(activeNote.replace(oldPath, newPath));
      }
      await loadNotes();
    } catch (err) {
      console.error("Failed to move note:", err);
    }
  };

  const handleDuplicateNote = async (path: string) => {
    try {
      const res = await fetch(`/api/notes?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      const newPath = `${path} (copy)`;
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newPath, content: data.content || "" }),
      });
      await loadNotes();
      setActiveNote(newPath);
    } catch (err) {
      console.error("Failed to duplicate note:", err);
    }
  };

  const handleFileDrop = async (fileName: string, fileContent: string) => {
    const path = fileName;
    try {
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: fileContent }),
      });
      await loadNotes();
      setActiveNote(path);
    } catch (err) {
      console.error("Failed to import file:", err);
    }
  };

  const handleDailyNote = useCallback(async () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const dateName = `${yyyy}-${mm}-${dd}`;
    const path = `Daily/${dateName}`;
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    try {
      // Try to load the note first — if it exists, just open it
      const res = await fetch(`/api/notes?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.content !== undefined) {
          setActiveNote(path);
          return;
        }
      }
    } catch {
      // Note doesn't exist, create it
    }

    // Build the daily note with memory briefing
    let header = `# ${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}, ${yyyy}\n\n`;

    // Inject memory briefing
    try {
      const ctxRes = await fetch("/api/memory/context");
      const ctx = await ctxRes.json();
      if (ctx.recent?.length > 0 || ctx.lastSessionAt) {
        header += "## Memory Briefing\n\n";
        if (ctx.lastSessionAt) {
          const ago = Date.now() - new Date(ctx.lastSessionAt).getTime();
          const hours = Math.floor(ago / 3600000);
          const label = hours < 1 ? "less than an hour" : hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
          header += `> Last session: ${label} ago\n\n`;
        }
        for (const mem of ctx.recent.slice(0, 5)) {
          const text = mem.observation.length > 120 ? mem.observation.slice(0, 120) + "..." : mem.observation;
          header += `- ${text}\n`;
        }
        header += "\n";
      }
    } catch {
      // Memory unavailable, skip briefing
    }

    header += "## Tasks\n\n- [ ] \n\n## Notes\n\n";

    try {
      // Ensure Daily folder exists
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "Daily", isFolder: true }),
      });
      // Create the daily note
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: header }),
      });
      await loadNotes();
      setActiveNote(path);
    } catch (err) {
      console.error("Failed to create daily note:", err);
    }
  }, [loadNotes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable || target.closest(".cm-editor");

      // "/" — open search (only when not typing)
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Escape — close command palette
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
      }
      // Ctrl+N — new note
      if (e.ctrlKey && !e.metaKey && e.key === "n") {
        e.preventDefault();
        handleCreateNote("");
      }
      // Ctrl+D — open today's daily note
      if (e.ctrlKey && !e.metaKey && e.key === "d") {
        e.preventDefault();
        handleDailyNote();
      }
      // Ctrl+S — toggle search / command palette
      if (e.ctrlKey && !e.metaKey && e.key === "s") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Ctrl+Shift+N — quick capture (avoid Cmd+Shift+N which Chrome intercepts)
      if (e.ctrlKey && !e.metaKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
      // ? — open help (only when not in an input/textarea)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && !(e.target as HTMLElement).isContentEditable) {
          e.preventDefault();
          setIsHelpOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCreateNote, handleDailyNote]);

  const handleNavigateWikiLink = useCallback(
    async (linkText: string) => {
      const resolved = resolveWikiLink(linkText, notes);
      if (resolved) {
        setActiveNote(resolved);
      } else {
        setConfirmDialog({
          message: `Note "${linkText}" not found. Create it?`,
          confirmLabel: "Create",
          onConfirm: async () => {
            setConfirmDialog(null);
            try {
              await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: linkText, content: `# ${linkText}\n\n` }),
              });
              await loadNotes();
              setActiveNote(linkText);
            } catch (err) {
              console.error("Failed to create note:", err);
            }
          },
        });
      }
    },
    [notes, loadNotes]
  );

  const flatNotes = useMemo(() => {
    const result: { name: string; path: string }[] = [];
    function walk(entries: NoteEntry[]) {
      for (const e of entries) {
        if (!e.isFolder) result.push({ name: e.name, path: e.path });
        if (e.children) walk(e.children);
      }
    }
    walk(notes);
    return result;
  }, [notes]);

  const findNoteModifiedAt = useCallback((path: string, entries: NoteEntry[]): string | undefined => {
    for (const e of entries) {
      if (e.path === path) return e.modifiedAt;
      if (e.isFolder && e.children) {
        const found = findNoteModifiedAt(path, e.children);
        if (found) return found;
      }
    }
    return undefined;
  }, []);

  const activeNoteModifiedAt = activeNote ? findNoteModifiedAt(activeNote, notes) : undefined;

  const handleRestoreVersion = useCallback((restoredContent: string) => {
    if (!activeNote) return;
    setContent(restoredContent);
    saveNote(activeNote, restoredContent);
  }, [activeNote, saveNote]);

  const handleInsertToNote = useCallback((aiContent: string) => {
    if (!activeNote) return;
    const newContent = content + "\n\n" + aiContent;
    setContent(newContent);
    saveNote(activeNote, newContent);
  }, [activeNote, content, saveNote]);

  const handleCreateNoteFromChat = useCallback((aiContent: string) => {
    const firstLine = aiContent.split("\n")[0];
    const defaultTitle = firstLine.replace(/^#+\s*/, "").trim().substring(0, 50);
    setPromptDialog({
      message: "Note name:",
      defaultValue: defaultTitle,
      onSubmit: async (name) => {
        setPromptDialog(null);
        try {
          await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: name, content: aiContent }),
          });
          await loadNotes();
          setActiveNote(name);
        } catch (err) {
          console.error("Failed to create note from chat:", err);
        }
      },
    });
  }, [loadNotes]);

  const handleEmptyDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-note-path")) return;
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsEmptyDragOver(true);
    }
  };

  const handleEmptyDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return;
    }
    setIsEmptyDragOver(false);
  };

  const handleEmptyDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsEmptyDragOver(false);

    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "md" || ext === "txt" || file.type.startsWith("text/")) {
        const text = await file.text();
        const name = file.name.replace(/\.(md|txt)$/, "");
        await handleFileDrop(name, text);
      }
    }
  };

  return (
    <>
    <CommandPalette
      isOpen={isCommandPaletteOpen}
      onClose={() => setIsCommandPaletteOpen(false)}
      onSelectNote={(path) => {
        handleSelectNote(path);
        setIsCommandPaletteOpen(false);
      }}
    />
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-3 py-2.5 border-b border-sidebar-border bg-sidebar-bg shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {activeNote ? (
            <button
              onClick={() => { setActiveNote(null); setContent(""); }}
              className="p-1.5 -ml-1 rounded-lg text-muted hover:text-accent transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 rounded-lg text-muted hover:text-foreground transition-colors"
            >
              <Menu size={20} />
            </button>
          )}
          <span className="text-sm font-medium truncate">
            {activeNote ? activeNote.split("/").pop()?.replace(/\.md$/, "") : "Novyx Vault"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {activeNote && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg text-muted hover:text-foreground transition-colors"
              title="Menu"
            >
              <Menu size={16} />
            </button>
          )}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-2 rounded-lg text-muted hover:text-foreground transition-colors"
          >
            <Search size={18} />
          </button>
          {activeNote && (
            <button
              onClick={() => setIsChatOpen((prev) => !prev)}
              className={`p-2 rounded-lg transition-colors ${isChatOpen ? "text-accent" : "text-muted hover:text-foreground"}`}
            >
              <MessageSquare size={18} />
            </button>
          )}
        </div>
      </header>

      <Sidebar
        notes={notes}
        activeNote={activeNote}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onCreateFolder={handleCreateFolder}
        onDeleteNote={handleDeleteNote}
        onMoveNote={handleMoveNote}
        onDailyNote={handleDailyNote}
        onOpenGraph={() => { closeAllModals(); setIsGraphOpen(true); }}
        onOpenMemory={() => { closeAllModals(); setIsMemoryOpen(true); }}
        onOpenHelp={() => { closeAllModals(); setIsHelpOpen(true); }}
        onOpenTrash={() => { closeAllModals(); setIsTrashOpen(true); }}
        onOpenStats={() => { closeAllModals(); setIsStatsOpen(true); }}
        onOpenTasks={() => { closeAllModals(); setIsTasksOpen(true); }}
        onOpenTags={() => { closeAllModals(); setIsTagsOpen(true); }}
        onOpenThinking={() => { closeAllModals(); setIsThinkingOpen(true); }}
        onOpenBrainDump={() => { closeAllModals(); setIsBrainDumpOpen(true); }}
        onOpenWritingCoach={() => { closeAllModals(); setIsWritingCoachOpen(true); }}
        onOpenClipRemix={() => { closeAllModals(); setIsClipRemixOpen(true); }}
        onOpenWeeklyReview={() => { closeAllModals(); setIsWeeklyReviewOpen(true); }}
        onOpenReflect={() => { closeAllModals(); setIsReflectOpen(true); }}
        onOpenUsage={() => { closeAllModals(); setIsUsageOpen(true); }}
        onOpenAuditTrail={() => { closeAllModals(); setIsAuditTrailOpen(true); }}
        onOpenRollbackHistory={() => { closeAllModals(); setIsRollbackHistoryOpen(true); }}
        onOpenControl={() => { closeAllModals(); setIsMissionControlOpen(true); }}
        onOpenSettings={() => { closeAllModals(); setIsSettingsOpen(true); }}
        onSignOut={process.env.NEXT_PUBLIC_SUPABASE_URL ? async () => {
          clearUserLocalStorage();
          await fetch("/api/auth/signout", { method: "POST" });
          window.location.href = "/login";
        } : undefined}        onGoHome={() => { setActiveNote(null); setContent(""); }}
        recentNotes={recentNotes}
        onDuplicateNote={handleDuplicateNote}
        pinnedNotes={pinnedNotes}
        onTogglePin={handleTogglePin}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {isReflectOpen ? (
            <ReflectTimeline
              notes={notes}
              onSelectNote={(path) => { setIsReflectOpen(false); handleSelectNote(path); }}
              onClose={() => setIsReflectOpen(false)}
            />
          ) : activeNote ? (
            <NoteEditor
              notePath={activeNote}
              content={content}
              onChange={handleContentChange}
              isSaving={isSaving}
              saveError={saveError}
              onFileDrop={handleFileDrop}
              onNavigateWikiLink={handleNavigateWikiLink}
              onSelectNote={handleSelectNote}
              onToggleChat={() => setIsChatOpen((prev) => !prev)}
              isChatOpen={isChatOpen}
              onRestore={handleRestoreVersion}
              onIngestLink={() => setIngestUrl("")}
              onPasteUrl={(url) => setIngestUrl(url)}
              noteModifiedAt={activeNoteModifiedAt}
            />
          ) : (
            <div
              className="flex-1 overflow-y-auto relative"
              onDragOver={handleEmptyDragOver}
              onDragLeave={handleEmptyDragLeave}
              onDrop={handleEmptyDrop}
            >
              <MorningBriefing
                recentNotes={recentNotes}
                noteCount={notes.length}
                onSelectNote={handleSelectNote}
                onCreateNote={() => handleCreateNote("")}
                onDailyNote={handleDailyNote}
                onOpenBrainDump={() => setIsBrainDumpOpen(true)}
                onOpenClipRemix={() => setIsClipRemixOpen(true)}
                onOpenWritingCoach={() => setIsWritingCoachOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenChat={() => setIsChatOpen(true)}
                onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
              />
              {isEmptyDragOver && (
                <div className="file-drop-overlay">
                  <div className="flex flex-col items-center gap-2 text-accent">
                    <Upload size={32} />
                    <span className="text-sm font-medium">Drop file to import</span>
                    <span className="text-xs text-muted">Supports .md and .txt files</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <ChatSidebar
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((prev) => !prev)}
          notePath={activeNote}
          noteContent={content}
          onNavigateWikiLink={handleNavigateWikiLink}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onInsertToNote={handleInsertToNote}
          onCreateNote={handleCreateNoteFromChat}
        />
      </main>
    </div>
    <SettingsModal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
    />
    <GraphView
      isOpen={isGraphOpen}
      onClose={() => setIsGraphOpen(false)}
      onSelectNote={(path) => {
        handleSelectNote(path);
        setIsGraphOpen(false);
      }}
      activeNote={activeNote}
    />
    <NovyxErrorBoundary fallbackTitle="Memory Dashboard failed to load" onClose={() => setIsMemoryOpen(false)}>
      <MemoryDashboard
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
      />
    </NovyxErrorBoundary>
    <NovyxErrorBoundary fallbackTitle="Usage data failed to load" onClose={() => setIsUsageOpen(false)}>
      <UsageView
        isOpen={isUsageOpen}
        onClose={() => setIsUsageOpen(false)}
      />
    </NovyxErrorBoundary>
    <NovyxErrorBoundary fallbackTitle="Audit Trail failed to load" onClose={() => setIsAuditTrailOpen(false)}>
      <AuditTrailView
        isOpen={isAuditTrailOpen}
        onClose={() => setIsAuditTrailOpen(false)}
      />
    </NovyxErrorBoundary>
    <NovyxErrorBoundary fallbackTitle="Rollback History failed to load" onClose={() => setIsRollbackHistoryOpen(false)}>
      <RollbackHistoryView
        isOpen={isRollbackHistoryOpen}
        onClose={() => setIsRollbackHistoryOpen(false)}
      />
    </NovyxErrorBoundary>
    <NovyxErrorBoundary fallbackTitle="Mission Control failed to load" onClose={() => setIsMissionControlOpen(false)}>
      <MissionControl
        isOpen={isMissionControlOpen}
        onClose={() => setIsMissionControlOpen(false)}
      />
    </NovyxErrorBoundary>
    <NovyxErrorBoundary fallbackTitle="Control failed to load" onClose={() => setIsControlOpen(false)}>
      <ControlView
        isOpen={isControlOpen}
        onClose={() => setIsControlOpen(false)}
      />
    </NovyxErrorBoundary>
    <NewNoteModal
      isOpen={newNoteFolder !== null}
      folderPath={newNoteFolder || ""}
      onClose={() => setNewNoteFolder(null)}
      onCreate={handleCreateNoteWithContent}
    />
    <LinkIngestModal
      isOpen={ingestUrl !== null}
      onClose={() => setIngestUrl(null)}
      onCreate={handleCreateNoteWithContent}
      onInsert={activeNote ? handleInsertToNote : undefined}
      initialUrl={ingestUrl || ""}
    />
    <QuickCapture
      isOpen={isQuickCaptureOpen}
      onClose={() => setIsQuickCaptureOpen(false)}
      onCreateNote={(name, noteContent) => {
        handleCreateNoteWithContent(name, noteContent);
      }}
    />
    <HelpModal
      isOpen={isHelpOpen}
      onClose={() => setIsHelpOpen(false)}
    />
    <VaultStats
      isOpen={isStatsOpen}
      onClose={() => setIsStatsOpen(false)}
      onSelectNote={handleSelectNote}
    />
    <TaskView
      isOpen={isTasksOpen}
      onClose={() => setIsTasksOpen(false)}
      onSelectNote={handleSelectNote}
    />
    <TagBrowser
      isOpen={isTagsOpen}
      onClose={() => setIsTagsOpen(false)}
      onSelectNote={handleSelectNote}
    />
    <ThinkingEvolution
      isOpen={isThinkingOpen}
      onClose={() => setIsThinkingOpen(false)}
    />
    <BrainDump
      isOpen={isBrainDumpOpen}
      onClose={() => setIsBrainDumpOpen(false)}
      onNoteSaved={(path) => { loadNotes(); setActiveNote(path); }}
      notes={flatNotes}
      onOpenSettings={() => setIsSettingsOpen(true)}
    />
    <WritingCoach
      isOpen={isWritingCoachOpen}
      onClose={() => setIsWritingCoachOpen(false)}
      onSelectNote={(path) => { handleSelectNote(path); setIsWritingCoachOpen(false); }}
      onCreateNote={(title) => { handleCreateNoteWithContent(title, `# ${title}\n\n`); setIsWritingCoachOpen(false); }}
      onOpenSettings={() => setIsSettingsOpen(true)}
    />
    <ClipRemix
      isOpen={isClipRemixOpen}
      onClose={() => setIsClipRemixOpen(false)}
      onNoteSaved={(path) => { loadNotes(); setActiveNote(path); }}
      notes={flatNotes}
      onOpenSettings={() => setIsSettingsOpen(true)}
    />
    <WeeklyReview
      isOpen={isWeeklyReviewOpen}
      onClose={() => setIsWeeklyReviewOpen(false)}
      onSelectNote={(path) => { handleSelectNote(path); setIsWeeklyReviewOpen(false); }}
    />
    {activeNote && (
      <GhostNotification
        notePath={activeNote}
        content={content}
        onSelectNote={handleSelectNote}
      />
    )}
    <TrashPanel
      isOpen={isTrashOpen}
      onClose={() => setIsTrashOpen(false)}
      onRestore={() => loadNotes()}
    />
    {confirmDialog && (
      <ConfirmDialog
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    )}
    {promptDialog && (
      <PromptDialog
        message={promptDialog.message}
        defaultValue={promptDialog.defaultValue}
        onSubmit={promptDialog.onSubmit}
        onCancel={() => setPromptDialog(null)}
      />
    )}
    <ImportPrompt />
    </>
  );
}
