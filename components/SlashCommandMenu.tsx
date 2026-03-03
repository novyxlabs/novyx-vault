"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  ListChecks,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  List,
  ListOrdered,
  Minus,
  Table,
  Link,
  Globe,
  Sparkles,
  Wand2,
  ListTree,
  PenLine,
  ArrowRight,
  SpellCheck,
  FileText,
} from "lucide-react";

interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  insert: string;
  cursorOffset?: number;
  isAI?: boolean;
}

const COMMANDS: SlashCommand[] = [
  // Formatting commands
  { id: "h1", label: "Heading 1", description: "Large heading", icon: <Heading1 size={16} />, insert: "# " },
  { id: "h2", label: "Heading 2", description: "Medium heading", icon: <Heading2 size={16} />, insert: "## " },
  { id: "h3", label: "Heading 3", description: "Small heading", icon: <Heading3 size={16} />, insert: "### " },
  { id: "todo", label: "To-do", description: "Checkbox item", icon: <ListChecks size={16} />, insert: "- [ ] " },
  { id: "bullet", label: "Bullet List", description: "Unordered list", icon: <List size={16} />, insert: "- " },
  { id: "numbered", label: "Numbered List", description: "Ordered list", icon: <ListOrdered size={16} />, insert: "1. " },
  { id: "quote", label: "Quote", description: "Block quote", icon: <Quote size={16} />, insert: "> " },
  { id: "code", label: "Code Block", description: "Fenced code", icon: <Code size={16} />, insert: "```\n\n```", cursorOffset: 4 },
  { id: "divider", label: "Divider", description: "Horizontal rule", icon: <Minus size={16} />, insert: "---\n" },
  { id: "table", label: "Table", description: "Markdown table", icon: <Table size={16} />, insert: "| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| | | |\n" },
  { id: "link", label: "Link", description: "Hyperlink", icon: <Link size={16} />, insert: "[](url)", cursorOffset: 5 },
  { id: "date", label: "Today's Date", description: "Insert current date", icon: <Calendar size={16} />, insert: "__DATE__" },
  { id: "ingest-link", label: "Ingest Link", description: "Fetch & save a URL", icon: <Globe size={16} />, insert: "__INGEST_LINK__" },
  // AI commands
  { id: "ai-expand", label: "Expand", description: "Flesh out with more detail", icon: <Wand2 size={16} />, insert: "__AI_EXPAND__", isAI: true },
  { id: "ai-continue", label: "Continue", description: "Keep writing from here", icon: <ArrowRight size={16} />, insert: "__AI_CONTINUE__", isAI: true },
  { id: "ai-brainstorm", label: "Brainstorm", description: "Generate related ideas", icon: <ListTree size={16} />, insert: "__AI_BRAINSTORM__", isAI: true },
  { id: "ai-rewrite", label: "Rewrite", description: "Polish and improve", icon: <PenLine size={16} />, insert: "__AI_REWRITE__", isAI: true },
  { id: "ai-summarize", label: "Summarize", description: "Condense to key points", icon: <FileText size={16} />, insert: "__AI_SUMMARIZE__", isAI: true },
  { id: "ai-fix", label: "Fix Grammar", description: "Fix spelling & grammar", icon: <SpellCheck size={16} />, insert: "__AI_FIX__", isAI: true },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  filter: string;
  position: { top: number; left: number };
  onSelect: (insert: string, cursorOffset?: number) => void;
  onClose: () => void;
}

export default function SlashCommandMenu({ isOpen, filter, position, onSelect, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase()) ||
      (cmd.isAI && "ai".includes(filter.toLowerCase()))
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIndex];
        if (cmd) {
          let text = cmd.insert;
          if (text === "__DATE__") {
            const d = new Date();
            text = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          }
          onSelect(text, cmd.cursorOffset);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [isOpen, filtered, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const items = menu.querySelectorAll("[data-cmd]");
    const item = items[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen || filtered.length === 0) return null;

  const hasFormatting = filtered.some((cmd) => !cmd.isAI);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-sidebar-bg border border-sidebar-border rounded-lg shadow-xl py-1 w-72 max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto"
      style={{
        top: Math.min(position.top, window.innerHeight - 300),
        left: Math.min(Math.max(position.left, 16), window.innerWidth - 296),
      }}
    >
      {filtered.map((cmd, i) => {
        const isFirstAI = cmd.isAI && (i === 0 || !filtered[i - 1].isAI);

        return (
          <div key={cmd.id}>
            {/* AI section separator */}
            {isFirstAI && hasFormatting && (
              <div className="flex items-center gap-2 px-3 py-1.5 mt-1 border-t border-sidebar-border">
                <Sparkles size={10} className="text-accent" />
                <span className="text-[10px] uppercase tracking-wider text-accent/60 font-medium">
                  AI Commands
                </span>
              </div>
            )}
            <button
              data-cmd={cmd.id}
              className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors ${
                i === selectedIndex
                  ? "bg-accent/15 text-foreground"
                  : "text-muted hover:bg-muted-bg hover:text-foreground"
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => {
                let text = cmd.insert;
                if (text === "__DATE__") {
                  const d = new Date();
                  text = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                }
                onSelect(text, cmd.cursorOffset);
              }}
            >
              <span className={`shrink-0 ${cmd.isAI ? "text-accent" : "text-muted"}`}>
                {cmd.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-1.5">
                  <span>{cmd.label}</span>
                  {cmd.isAI && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold leading-none">
                      AI
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">{cmd.description}</div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
