import path from "path";
import { getStorage } from "./storage";
import type { StorageContext } from "./notes";

export interface SearchResult {
  name: string;
  path: string;
  snippet: string;
  matchStart: number;
  matchEnd: number;
}

function extractSnippet(content: string, matchIndex: number, queryLength: number): { snippet: string; matchStart: number; matchEnd: number } {
  const lines = content.split("\n");
  let charCount = 0;
  let matchLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (charCount + lines[i].length >= matchIndex) {
      matchLineIndex = i;
      break;
    }
    charCount += lines[i].length + 1; // +1 for newline
  }

  const startLine = Math.max(0, matchLineIndex - 1);
  const endLine = Math.min(lines.length - 1, matchLineIndex + 1);
  const snippetLines = lines.slice(startLine, endLine + 1);
  const snippet = snippetLines.join("\n");

  // Calculate match position within snippet
  let prefixLength = 0;
  for (let i = startLine; i < matchLineIndex; i++) {
    prefixLength += lines[i].length + 1;
  }
  const matchStart = prefixLength + (matchIndex - charCount);
  const matchEnd = matchStart + queryLength;

  // Trim snippet if too long
  if (snippet.length > 200) {
    const trimStart = Math.max(0, matchStart - 80);
    const trimEnd = Math.min(snippet.length, trimStart + 200);
    const trimmed = (trimStart > 0 ? "..." : "") + snippet.slice(trimStart, trimEnd) + (trimEnd < snippet.length ? "..." : "");
    const offset = trimStart > 0 ? trimStart - 3 : 0; // 3 for "..."
    return {
      snippet: trimmed,
      matchStart: matchStart - offset,
      matchEnd: matchEnd - offset,
    };
  }

  return { snippet, matchStart, matchEnd };
}

interface SearchFilters {
  folder?: string;
  tag?: string;
}

// Per-request cache: avoids repeated walkAllNotes calls within the same tick.
// Keyed by userId (or "local"), auto-expires after 5 seconds.
let _cachedNotes: { key: string; notes: Awaited<ReturnType<ReturnType<typeof getStorage>["walkAllNotes"]>>; expiresAt: number } | null = null;

export async function getCachedNotes(ctx?: StorageContext) {
  const key = ctx?.userId || "local";
  const now = Date.now();
  if (_cachedNotes && _cachedNotes.key === key && _cachedNotes.expiresAt > now) {
    return _cachedNotes.notes;
  }
  const storage = getStorage(ctx?.userId, ctx?.cookieHeader);
  const notes = await storage.walkAllNotes();
  _cachedNotes = { key, notes, expiresAt: now + 5000 };
  return notes;
}

export async function searchNotes(query: string, maxResults = 20, filters?: SearchFilters, ctx?: StorageContext): Promise<SearchResult[]> {
  const notes = await getCachedNotes(ctx);
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const note of notes) {
    if (results.length >= maxResults) break;

    // Folder filter
    if (filters?.folder && !note.relPath.startsWith(filters.folder + path.sep) && !note.relPath.startsWith(filters.folder + "/")) {
      continue;
    }

    // Tag filter
    if (filters?.tag) {
      const tagPattern = new RegExp(`#${filters.tag}\\b`, "i");
      if (!tagPattern.test(note.content)) continue;
    }

    const matchIndex = note.content.toLowerCase().indexOf(lowerQuery);
    if (matchIndex === -1) continue;

    const { snippet, matchStart, matchEnd } = extractSnippet(note.content, matchIndex, query.length);

    results.push({ name: note.name, path: note.relPath, snippet, matchStart, matchEnd });
  }

  return results;
}
