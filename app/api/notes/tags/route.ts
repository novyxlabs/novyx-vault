import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";

const TAG_REGEX = /(?:^|\s)#([a-zA-Z][\w-]*)/g;

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const notes = await storage.walkAllNotes();
    const tagCounts = new Map<string, number>();
    const tagNotes = new Map<string, { path: string; name: string }[]>();

    for (const note of notes) {
      let match;
      TAG_REGEX.lastIndex = 0;
      const seenInFile = new Set<string>();
      while ((match = TAG_REGEX.exec(note.content)) !== null) {
        const tag = match[1].toLowerCase();
        if (!seenInFile.has(tag)) {
          seenInFile.add(tag);
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          if (!tagNotes.has(tag)) tagNotes.set(tag, []);
          tagNotes.get(tag)!.push({
            path: note.relPath,
            name: note.name,
          });
        }
      }
    }

    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count, notes: tagNotes.get(tag) || [] }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ tags });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Tags error:", e);
    return NextResponse.json({ tags: [] }, { status: 500 });
  }
}
