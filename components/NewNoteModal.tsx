"use client";

import { useState, useRef, useEffect } from "react";
import { X, FileText, Users, Kanban, Calendar, Lightbulb, BookOpen } from "lucide-react";
import { NOTE_TEMPLATES } from "@/lib/templates";
import type { NoteTemplate } from "@/lib/templates";

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText size={16} />,
  Users: <Users size={16} />,
  Kanban: <Kanban size={16} />,
  Calendar: <Calendar size={16} />,
  Lightbulb: <Lightbulb size={16} />,
  BookOpen: <BookOpen size={16} />,
};

interface NewNoteModalProps {
  isOpen: boolean;
  folderPath: string;
  onClose: () => void;
  onCreate: (path: string, content: string) => void;
}

export default function NewNoteModal({ isOpen, folderPath, onClose, onCreate }: NewNoteModalProps) {
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate>(NOTE_TEMPLATES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSelectedTemplate(NOTE_TEMPLATES[0]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const path = folderPath ? `${folderPath}/${name.trim()}` : name.trim();
    const content = selectedTemplate.content(name.trim());
    onCreate(path, content);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-[460px] mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sidebar-border">
          <h2 className="text-sm font-medium">New Note</h2>
          <button onClick={onClose} className="p-1 rounded text-muted hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {/* Name input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Note name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-card-bg border border-sidebar-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted outline-none focus:border-accent/50 mb-4"
          />

          {/* Template selection */}
          <p className="text-xs text-muted mb-2">Template</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {NOTE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => setSelectedTemplate(tmpl)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-xs ${
                  selectedTemplate.id === tmpl.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-sidebar-border bg-card-bg text-muted hover:text-foreground hover:border-accent/30"
                }`}
              >
                {ICON_MAP[tmpl.icon] || <FileText size={16} />}
                {tmpl.name}
              </button>
            ))}
          </div>

          {/* Create button */}
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Note
          </button>
        </form>
      </div>
    </div>
  );
}
