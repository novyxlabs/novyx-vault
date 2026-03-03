"use client";

import { useEffect } from "react";
import {
  X,
  Keyboard,
  Search,
  FileText,
  CalendarDays,
  Zap,
  Maximize2,
  Brain,
  MessageSquare,
  Pin,
  Download,
  Network,
  Globe,
  BookOpen,
  Eye,
  Code,
  Columns,
  Trash2,
  Type,
  Sun,
  Sparkles,
  CheckSquare,
  Link2,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

interface Shortcut {
  keys: string;
  label: string;
}

interface Feature {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const shortcuts: { category: string; items: Shortcut[] }[] = [
  {
    category: "Navigation",
    items: [
      { keys: "/", label: "Open command palette / search" },
      { keys: `${mod}+S`, label: "Toggle command palette" },
      { keys: "Esc", label: "Close any modal or panel" },
    ],
  },
  {
    category: "Notes",
    items: [
      { keys: `${mod}+N`, label: "Create new note" },
      { keys: `${mod}+D`, label: "Open today's daily note" },
      { keys: `${mod}+Shift+N`, label: "Quick capture" },
      { keys: `${mod}+Shift+F`, label: "Toggle focus mode" },
      { keys: `${mod}+Enter`, label: "Save (in Quick Capture)" },
    ],
  },
  {
    category: "Editor",
    items: [
      { keys: "/", label: "Slash commands (in editor)" },
      { keys: "[[", label: "Wiki link to another note" },
      { keys: "#tag", label: "Add a tag to your note" },
    ],
  },
];

const features: Feature[] = [
  {
    icon: <Search size={14} />,
    label: "Command Palette",
    description: "Search notes and memories. Press / or use the search bar.",
  },
  {
    icon: <Zap size={14} />,
    label: "Quick Capture",
    description: "Jot down a thought instantly. Save as note, memory, or both.",
  },
  {
    icon: <Brain size={14} />,
    label: "Memory Dashboard",
    description: "Browse, search, and manage AI memories. Click the brain icon in the sidebar footer.",
  },
  {
    icon: <MessageSquare size={14} />,
    label: "AI Chat",
    description: "Chat with context-aware AI that recalls your memories. Click the chat icon in the toolbar.",
  },
  {
    icon: <Pin size={14} />,
    label: "Pinned Notes",
    description: "Hover a note in the sidebar and click the pin icon. Pinned notes stay at the top.",
  },
  {
    icon: <Maximize2 size={14} />,
    label: "Focus Mode",
    description: "Distraction-free writing. Click the maximize icon or press " + mod + "+Shift+F.",
  },
  {
    icon: <CalendarDays size={14} />,
    label: "Daily Notes",
    description: "Auto-generated daily note with memory briefing. Click \"Today\" in the sidebar.",
  },
  {
    icon: <Network size={14} />,
    label: "Graph View",
    description: "Visualize connections between your notes. Click the graph icon in the sidebar header.",
  },
  {
    icon: <Globe size={14} />,
    label: "Link Ingestion",
    description: "Paste a URL in the editor to ingest web content as a note.",
  },
  {
    icon: <BookOpen size={14} />,
    label: "Remember This",
    description: "Save any note to AI memory. Click the brain icon in the note toolbar.",
  },
  {
    icon: <Eye size={14} />,
    label: "View Modes",
    description: "Switch between editor, preview, and split view using the toolbar buttons.",
  },
  {
    icon: <Download size={14} />,
    label: "Export",
    description: "Download individual notes or export all as a ZIP from the sidebar footer.",
  },
  {
    icon: <Trash2 size={14} />,
    label: "Trash & Restore",
    description: "Deleted notes go to trash. Restore or permanently delete from the trash icon in the sidebar footer.",
  },
  {
    icon: <Type size={14} />,
    label: "Formatting Toolbar",
    description: "Use the toolbar above the editor for bold, italic, headings, lists, quotes, and more.",
  },
  {
    icon: <Sun size={14} />,
    label: "Theme Toggle",
    description: "Switch between dark and light mode. Click the sun/moon icon in the sidebar footer.",
  },
  {
    icon: <Sparkles size={14} />,
    label: "Ghost Connections",
    description: "AI discovers semantically related notes — even with no shared keywords. Shows why they're connected.",
  },
  {
    icon: <CheckSquare size={14} />,
    label: "Task View",
    description: "See all tasks across your vault. Toggle checkboxes to mark done. Click the checkmark icon in the sidebar footer.",
  },
  {
    icon: <Link2 size={14} />,
    label: "Wiki-Link Previews",
    description: "Hover over [[wiki-links]] in preview mode to see a snippet of the linked note.",
  },
];

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[80vh] bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-accent" />
            <span className="text-sm font-medium">Help & Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-4">
              {shortcuts.map((group) => (
                <div key={group.category}>
                  <p className="text-xs text-accent mb-1.5">{group.category}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.keys} className="flex items-center justify-between py-1.5 px-3 rounded bg-card-bg">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.split("+").map((key, i) => (
                            <span key={i}>
                              {i > 0 && <span className="text-muted mx-0.5">+</span>}
                              <kbd className="text-xs bg-muted-bg text-muted px-1.5 py-0.5 rounded border border-sidebar-border font-mono">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features Guide */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {features.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-card-bg border border-sidebar-border"
                >
                  <div className="text-accent mt-0.5 shrink-0">{feature.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <p className="text-xs text-muted leading-relaxed mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">Tips</h3>
            <div className="space-y-1.5 text-sm text-foreground/80">
              <p>- Use <kbd className="text-xs bg-muted-bg text-muted px-1 py-0.5 rounded">[[note name]]</kbd> to link between notes</p>
              <p>- Type <kbd className="text-xs bg-muted-bg text-muted px-1 py-0.5 rounded">/</kbd> in the editor for slash commands (headings, lists, etc.)</p>
              <p>- Drag & drop <code className="text-xs">.md</code> or <code className="text-xs">.txt</code> files to import them</p>
              <p>- The AI chat remembers context from your conversations across sessions</p>
              <p>- Run Cortex in the Memory Dashboard to discover patterns in your memories</p>
              <p>- Pin your most-used notes for quick access at the top of the sidebar</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sidebar-border text-center shrink-0">
          <p className="text-[10px] text-muted">
            Press <kbd className="bg-muted-bg px-1 py-0.5 rounded">?</kbd> anytime to open this guide
          </p>
        </div>
      </div>
    </div>
  );
}
