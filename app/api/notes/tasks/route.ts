import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";

interface TaskItem {
  text: string;
  done: boolean;
  notePath: string;
  noteName: string;
  line: number;
}

const TASK_REGEX = /^(\s*)-\s*\[([ xX])\]\s+(.+)$/;

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const notes = await storage.walkAllNotes();
    const tasks: TaskItem[] = [];

    for (const note of notes) {
      const lines = note.content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(TASK_REGEX);
        if (match) {
          tasks.push({
            text: match[3].trim(),
            done: match[2] !== " ",
            notePath: note.relPath,
            noteName: note.name,
            line: i + 1,
          });
        }
      }
    }

    const total = tasks.length;
    const completed = tasks.filter((t) => t.done).length;
    const pending = total - completed;

    return NextResponse.json({ tasks, total, completed, pending });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Tasks error:", e);
    return NextResponse.json({ tasks: [], total: 0, completed: 0, pending: 0 }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { notePath, line, done } = await req.json();
    if (!notePath || !line) {
      return NextResponse.json({ error: "Missing notePath or line" }, { status: 400 });
    }

    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const content = await storage.readNote(notePath);
    const lines = content.split("\n");
    const idx = line - 1;

    if (idx < 0 || idx >= lines.length) {
      return NextResponse.json({ error: "Line out of range" }, { status: 400 });
    }

    const match = lines[idx].match(TASK_REGEX);
    if (!match) {
      return NextResponse.json({ error: "No task found at that line" }, { status: 400 });
    }

    const newMark = done ? "x" : " ";
    lines[idx] = lines[idx].replace(/\[([ xX])\]/, `[${newMark}]`);

    await storage.writeNote(notePath, lines.join("\n"));
    return NextResponse.json({ ok: true, done });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Task toggle error:", e);
    return NextResponse.json({ error: "Failed to toggle task" }, { status: 500 });
  }
}
