import path from "path";
import { getStorage } from "./storage";
import type { StorageAdapter } from "./storage";
import type { StorageContext } from "./notes";
import { parseLinks } from "./index/resolve";

export interface Backlink {
  name: string;
  path: string;
  context: string;
}

export async function findBacklinks(notePath: string, ctx?: StorageContext): Promise<Backlink[]> {
  const storage = getStorage(ctx?.userId, ctx?.cookieHeader);
  const noteName = path.basename(notePath, ".md").replace(/\.md$/, "");

  // Indexed path: O(log N) lookup when the adapter maintains an index.
  // null = index unavailable (e.g. not yet backfilled) → fall back to scan.
  if (typeof storage.getBacklinks === "function") {
    const indexed = await storage.getBacklinks(noteName, notePath);
    if (indexed !== null) return indexed;
  }

  return scanBacklinks(storage, notePath, noteName);
}

/** Legacy fallback: walk every note and scan for inbound wiki-links. */
async function scanBacklinks(
  storage: StorageAdapter,
  notePath: string,
  noteName: string
): Promise<Backlink[]> {
  const nameNorm = noteName.toLowerCase();
  const notePathNorm = notePath.toLowerCase().replace(/\.md$/, "");
  const notes = await storage.walkAllNotes();
  const backlinks: Backlink[] = [];

  for (const note of notes) {
    const filePathNorm = note.relPath.toLowerCase().replace(/\.md$/, "");
    // Skip self
    if (filePathNorm === notePathNorm) continue;

    // First inbound link to this note wins — its line becomes the context.
    const link = parseLinks(note.content).find(
      (l) => l.targetRaw === nameNorm || l.targetRaw === notePathNorm
    );
    if (link) {
      backlinks.push({
        name: path.basename(note.relPath, ".md"),
        path: note.relPath,
        context: link.context,
      });
    }
  }

  return backlinks;
}
