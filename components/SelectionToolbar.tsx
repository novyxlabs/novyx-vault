"use client";

import { PenLine, Wand2, FileText, SpellCheck } from "lucide-react";

interface SelectionToolbarProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onAction: (command: string) => void;
  isStreaming: boolean;
}

const ACTIONS = [
  { id: "rewrite", label: "Rewrite", icon: PenLine },
  { id: "expand", label: "Expand", icon: Wand2 },
  { id: "summarize", label: "Summarize", icon: FileText },
  { id: "fix", label: "Fix", icon: SpellCheck },
];

export default function SelectionToolbar({ isOpen, position, onAction, isStreaming }: SelectionToolbarProps) {
  if (!isOpen || isStreaming) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 bg-sidebar-bg border border-sidebar-border rounded-lg shadow-xl px-1 py-1 ghost-fade-in"
      style={{
        top: Math.max(position.top - 44, 8),
        left: Math.max(Math.min(position.left, window.innerWidth - 260), 8),
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {ACTIONS.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted hover:text-accent hover:bg-accent/10 transition-colors"
          title={action.label}
        >
          <action.icon size={13} />
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
