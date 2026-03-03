"use client";

import { useState, useEffect } from "react";
import { X, CheckSquare, Square, FileText, ChevronDown } from "lucide-react";

interface TaskItem {
  text: string;
  done: boolean;
  notePath: string;
  noteName: string;
  line: number;
}

interface TaskViewProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (path: string) => void;
}

export default function TaskView({ isOpen, onClose, onSelectNote }: TaskViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");
  const [collapsedNotes, setCollapsedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/notes/tasks")
      .then((r) => r.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setTotal(data.total || 0);
        setCompleted(data.completed || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.done;
    if (filter === "done") return t.done;
    return true;
  });

  // Group by note
  const grouped = new Map<string, TaskItem[]>();
  for (const task of filtered) {
    const key = task.notePath;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  const pending = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const toggleCollapse = (notePath: string) => {
    setCollapsedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(notePath)) next.delete(notePath);
      else next.add(notePath);
      return next;
    });
  };

  const toggleTask = async (task: TaskItem) => {
    const newDone = !task.done;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.notePath === task.notePath && t.line === task.line ? { ...t, done: newDone } : t
      )
    );
    setCompleted((prev) => prev + (newDone ? 1 : -1));

    try {
      const res = await fetch("/api/notes/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notePath: task.notePath, line: task.line, done: newDone }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.notePath === task.notePath && t.line === task.line ? { ...t, done: !newDone } : t
          )
        );
        setCompleted((prev) => prev + (newDone ? -1 : 1));
      }
    } catch {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.notePath === task.notePath && t.line === task.line ? { ...t, done: !newDone } : t
        )
      );
      setCompleted((prev) => prev + (newDone ? -1 : 1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-accent" />
            <h2 className="text-base font-semibold">Tasks</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted-bg text-muted hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-5 py-3 border-b border-sidebar-border">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>{pending} pending · {completed} done · {total} total</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-5 py-2 border-b border-sidebar-border">
          {(["pending", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filter === f
                  ? "bg-accent/20 text-accent"
                  : "text-muted hover:text-foreground hover:bg-muted-bg"
              }`}
            >
              {f === "pending" ? `Pending (${pending})` : f === "done" ? `Done (${completed})` : `All (${total})`}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="text-xs text-muted text-center py-8">Loading tasks...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={32} className="mx-auto text-muted/30 mb-2" />
              <p className="text-sm text-muted">
                {filter === "pending" ? "All tasks complete!" : "No tasks found"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...grouped.entries()].map(([notePath, noteTasks]) => {
                const isCollapsed = collapsedNotes.has(notePath);
                return (
                  <div key={notePath}>
                    <button
                      onClick={() => toggleCollapse(notePath)}
                      className="flex items-center gap-1.5 w-full text-left mb-1 group"
                    >
                      <ChevronDown
                        size={12}
                        className={`text-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                      />
                      <FileText size={12} className="text-accent" />
                      <span
                        className="text-xs font-medium text-muted group-hover:text-accent transition-colors truncate cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNote(notePath.replace(/\.md$/, ""));
                          onClose();
                        }}
                      >
                        {noteTasks[0].noteName}
                      </span>
                      <span className="text-[10px] text-muted/60 ml-auto shrink-0">
                        {noteTasks.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="ml-5 space-y-0.5">
                        {noteTasks.map((task, i) => (
                          <div
                            key={`${task.notePath}-${task.line}-${i}`}
                            className="flex items-start gap-2 py-1 px-2 rounded hover:bg-muted-bg/50 transition-colors"
                          >
                            <button
                              onClick={() => toggleTask(task)}
                              className="shrink-0 mt-0.5 hover:scale-110 transition-transform"
                            >
                              {task.done ? (
                                <CheckSquare size={14} className="text-accent/50" />
                              ) : (
                                <Square size={14} className="text-muted hover:text-accent" />
                              )}
                            </button>
                            <span
                              className={`text-xs leading-relaxed ${
                                task.done ? "text-muted line-through" : "text-foreground"
                              }`}
                            >
                              {task.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
