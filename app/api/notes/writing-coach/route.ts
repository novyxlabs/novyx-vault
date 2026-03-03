import { NextResponse } from "next/server";
import { listMemories, getCortexInsights, getMemoryDrift } from "@/lib/memory";
import { getStorage } from "@/lib/storage";
import type { NoteFile } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";

const TAG_REGEX = /#[a-zA-Z][\w-]*/g;
const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface Suggestion {
  type: "orphan" | "underexplored" | "hot_topic" | "stale" | "connection";
  title: string;
  description: string;
  relatedNotes: string[];
  tags: string[];
  priority: number;
}

function extractTags(content: string): string[] {
  const matches = content.match(TAG_REGEX) || [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

function extractWikiLinks(content: string): string[] {
  const links: string[] = [];
  let match;
  WIKILINK_REGEX.lastIndex = 0;
  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
}

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const nowISO = now.toISOString();

    // Gather vault data in parallel
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const [notes, memoriesResult, insightsResult, driftResult] = await Promise.all([
      storage.walkAllNotes(),
      listMemories(undefined, 20, 0, ctx.userId).catch(() => ({ memories: [], total: 0 })),
      getCortexInsights(10).catch(() => ({ insights: [], total: 0 })),
      getMemoryDrift(weekAgo, nowISO).catch(() => null),
    ]);

    // Build per-note metadata
    const noteTagMap = new Map<string, string[]>(); // path -> tags
    const noteLinkMap = new Map<string, string[]>(); // path -> outgoing wiki-link targets
    const tagNoteMap = new Map<string, string[]>(); // tag -> note paths
    const tagCount = new Map<string, number>(); // tag -> total note count
    const linkedTo = new Set<string>(); // note names that are linked TO
    const linksFrom = new Set<string>(); // note names that link FROM
    for (const note of notes) {
      const tags = extractTags(note.content);
      const links = extractWikiLinks(note.content);
      const nameLower = note.name.toLowerCase();

      noteTagMap.set(note.relPath, tags);
      noteLinkMap.set(note.relPath, links);

      for (const tag of tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
        if (!tagNoteMap.has(tag)) tagNoteMap.set(tag, []);
        tagNoteMap.get(tag)!.push(note.relPath);
      }

      if (links.length > 0) {
        linksFrom.add(nameLower);
        for (const link of links) {
          linkedTo.add(link.toLowerCase());
        }
      }
    }

    const totalTags = tagCount.size;
    const totalMemories = memoriesResult.total;
    const suggestions: Suggestion[] = [];

    // --- a. Orphan Notes ---
    // Notes with no wiki-links to/from other notes
    const orphanNotes: NoteFile[] = [];
    for (const note of notes) {
      const nameLower = note.name.toLowerCase();
      const hasIncoming = linkedTo.has(nameLower);
      const hasOutgoing = linksFrom.has(nameLower);
      if (!hasIncoming && !hasOutgoing) {
        orphanNotes.push(note);
      }
    }

    // Pick top orphans (prefer those with more content — they're more valuable to connect)
    const sortedOrphans = orphanNotes
      .filter((n) => n.content.trim().length > 50) // skip near-empty notes
      .sort((a, b) => b.content.length - a.content.length);

    for (const note of sortedOrphans.slice(0, 2)) {
      const tags = noteTagMap.get(note.relPath) || [];
      suggestions.push({
        type: "orphan",
        title: `Connect "${note.name}"`,
        description: `This note has no wiki-links to or from other notes. It contains ${Math.round(note.content.split(/\s+/).length)} words of isolated knowledge that could enrich your vault if linked.`,
        relatedNotes: [note.relPath],
        tags: tags.slice(0, 3),
        priority: 4,
      });
    }

    // --- b. Underexplored Tags ---
    // Tags used only 1-2 times
    const underexplored: [string, number][] = [];
    for (const [tag, count] of tagCount.entries()) {
      if (count <= 2) {
        underexplored.push([tag, count]);
      }
    }
    // Sort by count ascending (1 before 2), then alphabetically
    underexplored.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));

    for (const [tag, count] of underexplored.slice(0, 2)) {
      const notePaths = tagNoteMap.get(tag) || [];
      suggestions.push({
        type: "underexplored",
        title: `Dig deeper into #${tag}`,
        description: `You've used #${tag} in only ${count} ${count === 1 ? "note" : "notes"}. Writing more about this topic could strengthen your understanding and create new connections.`,
        relatedNotes: notePaths.slice(0, 3),
        tags: [tag],
        priority: 3,
      });
    }

    // --- c. Hot Topics ---
    // Tags/themes in recent memories and insights but with few or no notes
    const memoryTags = new Set<string>();
    for (const mem of memoriesResult.memories) {
      for (const tag of mem.tags) {
        memoryTags.add(tag.toLowerCase());
      }
    }
    // Include tags from cortex insights
    for (const insight of insightsResult.insights) {
      for (const tag of insight.tags) {
        memoryTags.add(tag.toLowerCase());
      }
    }
    // Also include drift new topics
    if (driftResult) {
      for (const topic of driftResult.topNewTopics) {
        memoryTags.add(topic.toLowerCase());
      }
    }

    const hotTopics: { tag: string; noteCount: number }[] = [];
    for (const memTag of memoryTags) {
      const noteCount = tagCount.get(memTag) || 0;
      if (noteCount <= 1) {
        hotTopics.push({ tag: memTag, noteCount });
      }
    }
    hotTopics.sort((a, b) => a.noteCount - b.noteCount);

    for (const ht of hotTopics.slice(0, 2)) {
      const notePaths = tagNoteMap.get(ht.tag) || [];
      suggestions.push({
        type: "hot_topic",
        title: `Write about "${ht.tag}"`,
        description: `This topic appears in your recent memories${ht.noteCount === 0 ? " but has no dedicated notes yet" : " but only has 1 note"}. Capture your evolving thoughts before they fade.`,
        relatedNotes: notePaths.slice(0, 3),
        tags: [ht.tag],
        priority: 5,
      });
    }

    // --- d. Stale Notes ---
    // Notes not modified in 30+ days that share tags with recently modified notes
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
    const recentNotes = notes.filter((n) => n.modifiedAt >= thirtyDaysAgo);
    const recentTags = new Set<string>();
    for (const note of recentNotes) {
      const tags = noteTagMap.get(note.relPath) || [];
      for (const tag of tags) {
        recentTags.add(tag);
      }
    }

    const staleNotes: { note: NoteFile; overlapTags: string[] }[] = [];
    for (const note of notes) {
      if (note.modifiedAt >= thirtyDaysAgo) continue;
      const tags = noteTagMap.get(note.relPath) || [];
      const overlap = tags.filter((t) => recentTags.has(t));
      if (overlap.length > 0) {
        staleNotes.push({ note, overlapTags: overlap });
      }
    }
    staleNotes.sort((a, b) => b.overlapTags.length - a.overlapTags.length);

    for (const { note, overlapTags } of staleNotes.slice(0, 2)) {
      const daysSince = Math.floor((now.getTime() - note.modifiedAt.getTime()) / (24 * 60 * 60 * 1000));
      suggestions.push({
        type: "stale",
        title: `Revisit "${note.name}"`,
        description: `Last edited ${daysSince} days ago, but shares tags (${overlapTags.slice(0, 3).map((t) => "#" + t).join(", ")}) with your recent work. It may benefit from an update.`,
        relatedNotes: [note.relPath],
        tags: overlapTags.slice(0, 3),
        priority: 2,
      });
    }

    // --- e. Connection Opportunities ---
    // Pairs of notes that share 2+ tags but don't link to each other
    const connectionPairs: { a: NoteFile; b: NoteFile; sharedTags: string[] }[] = [];
    const noteList = notes.filter((n) => (noteTagMap.get(n.relPath) || []).length > 0);

    for (let i = 0; i < noteList.length && connectionPairs.length < 20; i++) {
      for (let j = i + 1; j < noteList.length && connectionPairs.length < 20; j++) {
        const a = noteList[i];
        const b = noteList[j];
        const tagsA = noteTagMap.get(a.relPath) || [];
        const tagsB = new Set(noteTagMap.get(b.relPath) || []);
        const shared = tagsA.filter((t) => tagsB.has(t));

        if (shared.length < 2) continue;

        // Check they don't already link to each other
        const linksA = (noteLinkMap.get(a.relPath) || []).map((l) => l.toLowerCase());
        const linksB = (noteLinkMap.get(b.relPath) || []).map((l) => l.toLowerCase());
        const aLinksB = linksA.includes(b.name.toLowerCase());
        const bLinksA = linksB.includes(a.name.toLowerCase());

        if (!aLinksB && !bLinksA) {
          connectionPairs.push({ a, b, sharedTags: shared });
        }
      }
    }
    connectionPairs.sort((a, b) => b.sharedTags.length - a.sharedTags.length);

    for (const pair of connectionPairs.slice(0, 2)) {
      suggestions.push({
        type: "connection",
        title: `Link "${pair.a.name}" and "${pair.b.name}"`,
        description: `These notes share ${pair.sharedTags.length} tags (${pair.sharedTags.slice(0, 3).map((t) => "#" + t).join(", ")}) but don't reference each other. A wiki-link could bridge these ideas.`,
        relatedNotes: [pair.a.relPath, pair.b.relPath],
        tags: pair.sharedTags.slice(0, 4),
        priority: 3,
      });
    }

    // Sort by priority descending, limit to 8
    suggestions.sort((a, b) => b.priority - a.priority);
    const limited = suggestions.slice(0, 8);

    return NextResponse.json({
      suggestions: limited,
      vaultStats: {
        totalNotes: notes.length,
        totalTags: totalTags,
        totalMemories: totalMemories,
        orphanCount: orphanNotes.length,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Writing coach error:", err);
    return NextResponse.json(
      { suggestions: [], vaultStats: { totalNotes: 0, totalTags: 0, totalMemories: 0, orphanCount: 0 } },
      { status: 500 }
    );
  }
}
