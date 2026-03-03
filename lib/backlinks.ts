import path from "path";
import { getStorage } from "./storage";
import type { StorageContext } from "./notes";

export interface Backlink {
  name: string;
  path: string;
  context: string;
}

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export async function findBacklinks(notePath: string, ctx?: StorageContext): Promise<Backlink[]> {
  const noteName = path.basename(notePath, ".md").replace(/\.md$/, "").toLowerCase();
  const notePathNorm = notePath.toLowerCase().replace(/\.md$/, "");
  const storage = getStorage(ctx?.userId, ctx?.cookieHeader);
  const notes = await storage.walkAllNotes();
  const backlinks: Backlink[] = [];

  for (const note of notes) {
    const filePathNorm = note.relPath.toLowerCase().replace(/\.md$/, "");
    // Skip self
    if (filePathNorm === notePathNorm) continue;

    // Check if any wiki-link in this file points to our note
    const lines = note.content.split("\n");
    for (const line of lines) {
      let match;
      WIKILINK_REGEX.lastIndex = 0;
      let found = false;

      while ((match = WIKILINK_REGEX.exec(line)) !== null) {
        const linkText = match[1].trim().toLowerCase();
        if (linkText === noteName || linkText === notePathNorm) {
          backlinks.push({
            name: path.basename(note.relPath, ".md"),
            path: note.relPath,
            context: line.trim(),
          });
          found = true;
          break;
        }
      }
      if (found) break; // one backlink entry per file
    }
  }

  return backlinks;
}
