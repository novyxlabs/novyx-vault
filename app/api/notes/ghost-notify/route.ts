import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getStorage } from "@/lib/storage";
import type { NoteFile } from "@/lib/storage";
import { recallMemories, listMemories } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";

// --- Stop words for concept extraction ---

const STOP_WORDS = new Set([
  "i", "me", "my", "the", "a", "an", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "can",
  "what", "which", "who", "whom", "this", "that", "these", "those",
  "am", "it", "its", "of", "in", "on", "at", "to", "for", "with",
  "about", "from", "up", "out", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no",
  "not", "only", "same", "so", "than", "too", "very", "just",
  "because", "as", "until", "while", "there", "here", "when",
  "where", "why", "again", "further", "then", "once", "any",
  "tell", "know", "think", "find", "get", "make", "go", "see",
  "look", "also", "and", "but", "or", "if", "use", "using",
  "used", "like", "new", "way", "want", "need", "try", "take",
  "come", "work", "call", "first", "well", "even", "give",
  "many", "much", "still", "back", "after", "thing", "things",
  "really", "note", "notes", "write", "writing", "wrote",
]);

// --- Concept extraction from recent content ---

function extractConcepts(content: string): string[] {
  // Focus on the last 500 chars — what's being written NOW
  const recentText = content.slice(-500);

  const words = recentText
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Count frequency
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency descending, then by length descending (longer = more specific)
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([word]) => word);

  // Return 3-5 key terms
  return sorted.slice(0, 5);
}

// --- Notification types ---

interface GhostNotification {
  type: "memory" | "note";
  title: string;
  body: string;
  notePath?: string;
  relevance: number;
}

// --- Calculate a surprise score: older and more relevant = more surprising ---

function surpriseScore(
  relevance: number,
  ageMs: number
): number {
  // Older items are more surprising (user likely forgot)
  // Cap at 90 days worth of bonus
  const ageDays = Math.min(ageMs / (1000 * 60 * 60 * 24), 90);
  const ageBonus = ageDays / 90 * 0.3; // Up to 0.3 bonus for old items
  return Math.min(1.0, relevance + ageBonus);
}

// --- Format a relative time string ---

function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "earlier today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "about a week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return "about a month ago";
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return "over a year ago";
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const body = await req.json();
    const { content, notePath } = body as {
      content: string;
      notePath: string;
    };

    if (!content || !notePath) {
      return NextResponse.json({ notification: null });
    }

    // Extract key concepts from what the user is currently writing
    const concepts = extractConcepts(content);
    if (concepts.length === 0) {
      return NextResponse.json({ notification: null });
    }

    const query = concepts.join(" ");

    // Run memory search and note search in parallel
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const [memoryResults, noteFiles] = await Promise.all([
      searchMemories(query, ctx.userId),
      storage.walkAllNotes(),
    ]);

    // Normalize the current note path for comparison
    const currentPathNorm = notePath
      .replace(/\.md$/, "")
      .toLowerCase();

    // --- Search notes for content matches ---
    const noteMatches = await findNoteMatches(
      concepts,
      noteFiles,
      currentPathNorm
    );

    // --- Build candidate notifications ---
    const candidates: GhostNotification[] = [];

    // Memory candidates
    for (const mem of memoryResults) {
      const createdAt = new Date(mem.created_at);
      const ageMs = Date.now() - createdAt.getTime();
      const relevance = surpriseScore(
        Math.min(1.0, mem.importance * 0.8 + 0.2),
        ageMs
      );

      // Only include if above threshold
      if (relevance < 0.4) continue;

      candidates.push({
        type: "memory",
        title: `You thought about this ${formatTimeAgo(createdAt)}`,
        body:
          mem.observation.length > 120
            ? mem.observation.slice(0, 120) + "..."
            : mem.observation,
        relevance,
      });
    }

    // Note candidates
    for (const match of noteMatches) {
      const ageMs = Date.now() - match.modifiedAt.getTime();
      const relevance = surpriseScore(match.score, ageMs);

      if (relevance < 0.4) continue;

      const noteName = path.basename(match.relPath, ".md");
      candidates.push({
        type: "note",
        title: `You wrote about this ${formatTimeAgo(match.modifiedAt)}`,
        body: `Your note "${noteName}" mentions similar concepts: ${match.snippet}`,
        notePath: match.relPath.replace(/\.md$/, ""),
        relevance,
      });
    }

    // Sort by relevance descending
    candidates.sort((a, b) => b.relevance - a.relevance);

    // Return the most surprising connection, or null
    const best = candidates[0] || null;

    const response = NextResponse.json({
      notification: best,
    });

    // Cooldown hint for the client (2 minutes)
    response.headers.set("X-Ghost-Cooldown", "120");

    return response;
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Ghost notify error:", err);
    return NextResponse.json({ notification: null }, { status: 500 });
  }
}

// --- Search memories using Novyx ---

async function searchMemories(
  query: string,
  userId?: string
): Promise<
  { observation: string; importance: number; created_at: string }[]
> {
  try {
    // Use listMemories with query to get structured results
    const { memories } = await listMemories(query, 10, 0, userId);
    return memories.map((m) => ({
      observation: m.observation,
      importance: m.importance,
      created_at: m.created_at,
    }));
  } catch {
    // Fall back to recallMemories for plain text results
    try {
      const observations = await recallMemories(query, userId);
      return observations.slice(0, 5).map((obs) => ({
        observation: obs,
        importance: 0.5,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    } catch {
      return [];
    }
  }
}

// --- Find matching notes by scanning the filesystem ---

interface NoteMatch {
  relPath: string;
  snippet: string;
  score: number;
  modifiedAt: Date;
}

async function findNoteMatches(
  concepts: string[],
  files: NoteFile[],
  currentPathNorm: string
): Promise<NoteMatch[]> {
  const hitMap = new Map<
    string,
    { snippet: string; hits: number; modifiedAt: Date }
  >();

  // Sample up to 50 files to keep response fast
  const filesToCheck = files.slice(0, 50);

  for (const file of filesToCheck) {
    const relPathNorm = file.relPath.replace(/\.md$/, "").toLowerCase();
    if (relPathNorm === currentPathNorm) continue;

    const lowerContent = file.content.toLowerCase();
    let matchCount = 0;

    for (const concept of concepts) {
      if (lowerContent.includes(concept)) {
        matchCount++;
      }
    }

    if (matchCount === 0) continue;

    // Extract a snippet around the first match
    const firstConcept = concepts.find((c) => lowerContent.includes(c));
    let snippet = "";
    if (firstConcept) {
      const idx = lowerContent.indexOf(firstConcept);
      const start = Math.max(0, idx - 40);
      const end = Math.min(file.content.length, idx + 80);
      snippet = file.content.slice(start, end).replace(/\n/g, " ").trim();
      if (start > 0) snippet = "..." + snippet;
      if (end < file.content.length) snippet = snippet + "...";
    }

    const score = Math.min(0.9, 0.3 + (matchCount / concepts.length) * 0.6);

    const existing = hitMap.get(file.relPath);
    if (!existing || score > existing.hits / concepts.length) {
      hitMap.set(file.relPath, {
        snippet,
        hits: matchCount,
        modifiedAt: file.modifiedAt,
      });
    }
  }

  const results: NoteMatch[] = [];
  for (const [relPath, data] of hitMap) {
    results.push({
      relPath,
      snippet: data.snippet,
      score: Math.min(0.9, 0.3 + (data.hits / concepts.length) * 0.6),
      modifiedAt: data.modifiedAt,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}
