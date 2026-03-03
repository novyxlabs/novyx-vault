"use client";

import { useState, useEffect, useRef } from "react";
import { FileText } from "lucide-react";

interface WikiLinkMenuProps {
  isOpen: boolean;
  filter: string;
  position: { top: number; left: number };
  onSelect: (noteName: string) => void;
  onClose: () => void;
}

export default function WikiLinkMenu({ isOpen, filter, position, onSelect, onClose }: WikiLinkMenuProps) {
  const [results, setResults] = useState<{ path: string; name: string }[]>([]);
  const [selected, setSelected] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/notes")
      .then((r) => r.json())
      .then((data) => {
        const flat: { path: string; name: string }[] = [];
        function walk(entries: { path: string; name: string; isFolder: boolean; children?: any[] }[]) {
          for (const e of entries) {
            if (!e.isFolder) flat.push({ path: e.path, name: e.name });
            if (e.children) walk(e.children);
          }
        }
        walk(data.notes || []);

        const filtered = filter
          ? flat.filter((n) => n.name.toLowerCase().includes(filter.toLowerCase()))
          : flat;

        setResults(filtered.slice(0, 8));
        setSelected(0);
      })
      .catch(() => {});
  }, [isOpen, filter]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        onSelect(results[selected].name);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, results, selected, onSelect, onClose]);

  if (!isOpen || results.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-sidebar-bg border border-sidebar-border rounded-lg shadow-xl py-1 w-56 max-h-48 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {results.map((result, i) => (
        <button
          key={result.path}
          onClick={() => onSelect(result.name)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
            i === selected ? "bg-accent/15 text-foreground" : "text-muted hover:bg-muted-bg hover:text-foreground"
          }`}
        >
          <FileText size={14} className="shrink-0" />
          <span className="truncate">{result.name}</span>
        </button>
      ))}
    </div>
  );
}
