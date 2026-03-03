import path from "path";
import { readNote, type StorageContext } from "./notes";
import { recallMemories } from "./memory";
import { searchNotes, getCachedNotes } from "./search";

export interface GhostConnection {
  notePath: string;
  noteName: string;
  snippet: string;
  connectionType: "semantic" | "content" | "tags";
  score: number;
}

// --- Stop words (shared with chat route) ---

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
  "look", "also", "and", "but", "or", "if",
]);

// --- Concept extraction ---

interface KeyConcepts {
  summary: string;
  terms: string[];
  tags: string[];
  headings: string[];
}

export function extractKeyConcepts(content: string, noteName: string): KeyConcepts {
  // Headings
  const headings: string[] = [];
  const headingRegex = /^#{1,6}\s+(.+)/gm;
  let hMatch;
  while ((hMatch = headingRegex.exec(content)) !== null) {
    headings.push(hMatch[1].replace(/[#*_`\[\]]/g, "").trim());
  }

  // Tags
  const tags: string[] = [];
  const tagRegex = /(?:^|\s)#([a-zA-Z][\w-]*)/g;
  let tMatch;
  while ((tMatch = tagRegex.exec(content)) !== null) {
    if (!tags.includes(tMatch[1].toLowerCase())) {
      tags.push(tMatch[1].toLowerCase());
    }
  }

  // Key terms — from first 500 chars + headings
  const textBlock = content.slice(0, 500) + " " + headings.join(" ");
  const words = textBlock
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const unique = [...new Set(words)];
  // Sort by length descending (longer terms are more distinctive)
  unique.sort((a, b) => b.length - a.length);
  const terms = unique.slice(0, 10);

  // Summary for semantic recall
  const cleanContent = content.replace(/^#{1,6}\s+/gm, "").replace(/[#*_`\[\]]/g, "");
  const summary = `${noteName}: ${cleanContent.slice(0, 300)}`;

  return { summary, terms, tags, headings };
}

// --- Wiki-link extraction (to exclude already-linked notes) ---

function extractWikiLinks(content: string): Set<string> {
  const links = new Set<string>();
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.add(match[1].trim().toLowerCase());
  }
  return links;
}

// --- Strategy 1: Semantic (Novyx) ---

async function findSemanticConnections(
  summary: string,
  sourcePath: string,
  limit: number,
  ctx?: StorageContext
): Promise<GhostConnection[]> {
  const memories = await recallMemories(summary);
  if (memories.length === 0) return [];

  const results: GhostConnection[] = [];
  const seenPaths = new Set<string>();

  // For each memory, take a snippet and search for notes containing it
  for (const observation of memories.slice(0, 5)) {
    const searchTerm = observation.slice(0, 60).replace(/[^\w\s]/g, "").trim();
    if (searchTerm.length < 5) continue;

    try {
      const hits = await searchNotes(searchTerm, 3, undefined, ctx);
      for (const hit of hits) {
        if (hit.path === sourcePath || seenPaths.has(hit.path)) continue;
        seenPaths.add(hit.path);
        results.push({
          notePath: hit.path,
          noteName: hit.name,
          snippet: hit.snippet.slice(0, 150),
          connectionType: "semantic",
          score: 0.8,
        });
      }
    } catch {
      // Skip failed searches
    }
  }

  // Boost notes found via multiple memory hits
  const pathCounts = new Map<string, number>();
  for (const r of results) {
    pathCounts.set(r.notePath, (pathCounts.get(r.notePath) || 0) + 1);
  }
  for (const r of results) {
    if ((pathCounts.get(r.notePath) || 0) > 1) {
      r.score = Math.min(0.9, r.score + 0.1);
    }
  }

  return results.slice(0, limit);
}

// --- Strategy 2: Content (term matching) ---

async function findContentConnections(
  terms: string[],
  headings: string[],
  sourcePath: string,
  limit: number,
  ctx?: StorageContext
): Promise<GhostConnection[]> {
  const hitMap = new Map<string, { name: string; snippet: string; hits: number; headingHit: boolean }>();

  // Search key terms
  for (const term of terms.slice(0, 8)) {
    try {
      const results = await searchNotes(term, 5, undefined, ctx);
      for (const r of results) {
        if (r.path === sourcePath) continue;
        const existing = hitMap.get(r.path);
        if (existing) {
          existing.hits++;
        } else {
          hitMap.set(r.path, { name: r.name, snippet: r.snippet.slice(0, 150), hits: 1, headingHit: false });
        }
      }
    } catch {
      // Skip
    }
  }

  // Search heading phrases (stronger signal)
  for (const heading of headings.slice(0, 3)) {
    if (heading.length < 4) continue;
    try {
      const results = await searchNotes(heading, 3, undefined, ctx);
      for (const r of results) {
        if (r.path === sourcePath) continue;
        const existing = hitMap.get(r.path);
        if (existing) {
          existing.hits++;
          existing.headingHit = true;
        } else {
          hitMap.set(r.path, { name: r.name, snippet: r.snippet.slice(0, 150), hits: 1, headingHit: true });
        }
      }
    } catch {
      // Skip
    }
  }

  const totalSearches = Math.min(terms.length, 8) + Math.min(headings.length, 3);
  const connections: GhostConnection[] = [];

  for (const [notePath, data] of hitMap) {
    const hitRatio = totalSearches > 0 ? data.hits / totalSearches : 0;
    let score = 0.3 + hitRatio * 0.5;
    if (data.headingHit) score += 0.15;
    score = Math.min(0.95, score);

    connections.push({
      notePath,
      noteName: data.name,
      snippet: data.snippet,
      connectionType: "content",
      score,
    });
  }

  connections.sort((a, b) => b.score - a.score);
  return connections.slice(0, limit);
}

// --- Strategy 3: Tags ---

async function findTagConnections(
  sourceTags: string[],
  sourcePath: string,
  limit: number,
  ctx?: StorageContext
): Promise<GhostConnection[]> {
  if (sourceTags.length === 0) return [];

  const notes = await getCachedNotes(ctx);
  const connections: GhostConnection[] = [];
  const tagSet = new Set(sourceTags);

  for (const note of notes) {
    const relPathNoMd = note.relPath.replace(/\.md$/, "");
    if (relPathNoMd === sourcePath || relPathNoMd === sourcePath.replace(/\.md$/, "")) continue;

    // Only check first 2000 chars for tags (performance)
    const chunk = note.content.slice(0, 2000);
    const fileTags: string[] = [];
    const tagRegex = /(?:^|\s)#([a-zA-Z][\w-]*)/g;
    let m;
    while ((m = tagRegex.exec(chunk)) !== null) {
      fileTags.push(m[1].toLowerCase());
    }

    const shared = fileTags.filter((t) => tagSet.has(t));
    if (shared.length === 0) continue;

    const sharedRatio = shared.length / sourceTags.length;
    const score = Math.min(0.8, 0.4 + sharedRatio * 0.4);
    const snippet = note.content.replace(/^#{1,6}\s+/gm, "").slice(0, 150).trim();

    connections.push({
      notePath: relPathNoMd,
      noteName: note.name,
      snippet,
      connectionType: "tags",
      score,
    });
  }

  connections.sort((a, b) => b.score - a.score);
  return connections.slice(0, limit);
}

// --- Main: Find connections ---

export async function findConnections(notePath: string, limit = 5, ctx?: StorageContext): Promise<GhostConnection[]> {
  let content: string;
  try {
    content = await readNote(notePath, ctx);
  } catch {
    return [];
  }

  // Too short to find meaningful connections
  if (content.trim().length < 50) return [];

  const noteName = path.basename(notePath, ".md").replace(/\.md$/, "");
  const { summary, terms, tags, headings } = extractKeyConcepts(content, noteName);
  const existingLinks = extractWikiLinks(content);

  // Run all three strategies in parallel
  const [semantic, contentConns, tagConns] = await Promise.all([
    findSemanticConnections(summary, notePath, limit * 2, ctx),
    findContentConnections(terms, headings, notePath, limit * 2, ctx),
    findTagConnections(tags, notePath, limit * 2, ctx),
  ]);

  // Merge into a map, keeping best score per note
  const merged = new Map<string, GhostConnection>();
  const signalCounts = new Map<string, number>();

  for (const conn of [...semantic, ...contentConns, ...tagConns]) {
    // Skip notes that are already wiki-linked
    const nameNorm = conn.noteName.toLowerCase();
    const pathNorm = conn.notePath.toLowerCase().replace(/\.md$/, "");
    if (existingLinks.has(nameNorm) || existingLinks.has(pathNorm)) continue;

    signalCounts.set(conn.notePath, (signalCounts.get(conn.notePath) || 0) + 1);

    const existing = merged.get(conn.notePath);
    if (!existing || conn.score > existing.score) {
      merged.set(conn.notePath, conn);
    }
  }

  // Multi-signal bonus
  const results = [...merged.values()];
  for (const r of results) {
    if ((signalCounts.get(r.notePath) || 0) > 1) {
      r.score = Math.min(1.0, r.score + 0.05);
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
