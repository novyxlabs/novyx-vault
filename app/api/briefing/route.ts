import { NextResponse } from "next/server";
import {
  getContextNow,
  getCortexInsights,
  getMemoryDrift,
  listMemories,
} from "@/lib/memory";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

const TASK_REGEX = /^(\s*)-\s*\[([ xX])\]\s+(.+)$/;

interface TaskItem {
  text: string;
  note: string;
}

async function scanPendingTasks(userId?: string, cookieHeader?: string): Promise<{
  taskCount: number;
  tasksDue: TaskItem[];
  noteCount: number;
}> {
  const storage = getStorage(userId, cookieHeader);
  const notes = await storage.walkAllNotes();
  const pendingTasks: TaskItem[] = [];

  for (const note of notes) {
    const lines = note.content.split("\n");
    for (const line of lines) {
      const match = line.match(TASK_REGEX);
      if (match && match[2] === " ") {
        pendingTasks.push({
          text: match[3].trim(),
          note: note.relPath,
        });
      }
    }
  }

  return {
    taskCount: pendingTasks.length,
    tasksDue: pendingTasks.slice(0, 3),
    noteCount: notes.length,
  };
}

export async function GET() {
  try {
  const ctx = await getStorageContext();
  const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
  const nk = apiKey ?? undefined;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const nowISO = now.toISOString();

  // Fetch all data in parallel
  const [context, insights, drift, recentMems, taskData] = await Promise.all([
    getContextNow(nk),
    getCortexInsights(5, nk),
    getMemoryDrift(weekAgo, nowISO, nk),
    listMemories(undefined, 10, 0, ctx.userId, nk),
    scanPendingTasks(ctx.userId, ctx.cookieHeader),
  ]);

  const filterUserTags = (tags: string[]) => tags.filter((t) => !t.startsWith("user:"));

  return NextResponse.json({
    lastSession: context?.lastSessionAt || null,
    memoryCount: recentMems.total,
    noteCount: taskData.noteCount,
    recentMemories: (context?.recent || []).slice(0, 5).map((m) => ({
      observation: m.observation,
      importance: m.importance,
      tags: filterUserTags(m.tags),
      created_at: m.created_at,
    })),
    insights: (insights.insights || []).slice(0, 3).map((i) => ({
      observation: i.observation,
      tags: filterUserTags(i.tags),
      importance: i.importance,
    })),
    drift: drift
      ? {
          newTopics: drift.topNewTopics.filter((t: string) => !t.startsWith("user:")).slice(0, 5),
          lostTopics: drift.topLostTopics.filter((t: string) => !t.startsWith("user:")).slice(0, 3),
          memoryDelta: drift.memoryCountDelta,
          importanceDelta: drift.avgImportanceDelta,
          tagShifts: drift.tagShifts.filter((s: { tag: string }) => !s.tag?.startsWith("user:")).slice(0, 5),
        }
      : null,
    pendingTasks: taskData.taskCount,
    tasksDue: taskData.tasksDue,
  });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
