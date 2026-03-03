import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export async function GET() {
  try {
  const ctx = await getStorageContext();
  const storage = getStorage(ctx.userId, ctx.cookieHeader);
  const notes = await storage.walkAllNotes();

  let totalWords = 0;
  const tags = new Map<string, number>();
  const linkedTo = new Set<string>(); // notes that are linked TO (by name)
  const linksFrom = new Set<string>(); // notes that link FROM

  for (const note of notes) {
    const trimmed = note.content.trim();
    if (trimmed) {
      totalWords += trimmed.split(/\s+/).length;
    }

    // Tags
    const tagMatches = note.content.match(/#[a-zA-Z][\w-]*/g);
    if (tagMatches) {
      for (const tag of tagMatches) {
        const t = tag.slice(1);
        tags.set(t, (tags.get(t) || 0) + 1);
      }
    }

    // Wiki-links
    let match;
    WIKILINK_RE.lastIndex = 0;
    while ((match = WIKILINK_RE.exec(note.content)) !== null) {
      linkedTo.add(match[1].toLowerCase());
      linksFrom.add(note.name.toLowerCase());
    }
  }

  // Find orphaned notes (no incoming or outgoing wiki-links)
  const orphaned: { name: string; path: string }[] = [];
  for (const note of notes) {
    const nameLower = note.name.toLowerCase();
    const hasIncoming = linkedTo.has(nameLower);
    const hasOutgoing = linksFrom.has(nameLower);
    if (!hasIncoming && !hasOutgoing) {
      orphaned.push({ name: note.name, path: note.relPath });
    }
  }

  // Count daily notes via walkAllNotes (filter by path prefix)
  const dailyCount = notes.filter((n) => n.relPath.startsWith("Daily/") || n.relPath.startsWith("Daily\\")).length;

  const topTags = [...tags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, cnt]) => ({ tag, count: cnt }));

  const noteCount = notes.length;

  return NextResponse.json({
    noteCount,
    totalWords,
    dailyNoteCount: dailyCount,
    avgWordsPerNote: noteCount > 0 ? Math.round(totalWords / noteCount) : 0,
    topTags,
    orphanedNotes: orphaned.slice(0, 10),
    orphanedCount: orphaned.length,
  });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
