import path from "path";
import { getStorage } from "./storage";
import type { StorageContext } from "./notes";

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export interface GraphNode {
  id: string;
  name: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export async function buildGraph(ctx?: StorageContext): Promise<GraphData> {
  const storage = getStorage(ctx?.userId, ctx?.cookieHeader);
  const notes = await storage.walkAllNotes();

  // Build a lookup: lowercased name (without .md) -> note path (without .md)
  const nameToPath = new Map<string, string>();
  const pathToName = new Map<string, string>();

  for (const note of notes) {
    const notePath = note.relPath.replace(/\.md$/, "");
    const noteName = path.basename(notePath);
    nameToPath.set(noteName.toLowerCase(), notePath);
    pathToName.set(notePath, noteName);
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeIds = new Set<string>();

  // Create nodes for all files
  for (const note of notes) {
    const id = note.relPath.replace(/\.md$/, "");
    const name = path.basename(id);
    nodes.push({ id, name });
    nodeIds.add(id);
  }

  // Extract links from wiki-links in each file
  for (const note of notes) {
    const sourceId = note.relPath.replace(/\.md$/, "");

    const seen = new Set<string>();
    let match;
    WIKILINK_REGEX.lastIndex = 0;
    while ((match = WIKILINK_REGEX.exec(note.content)) !== null) {
      const linkText = match[1].trim();
      const linkLower = linkText.toLowerCase();

      // Resolve: try exact path match first, then name match
      let targetId = nameToPath.get(linkLower);
      if (!targetId) {
        // Try as a path
        for (const [, notePath] of nameToPath) {
          if (notePath.toLowerCase() === linkLower) {
            targetId = notePath;
            break;
          }
        }
      }

      if (targetId && targetId !== sourceId && !seen.has(targetId)) {
        seen.add(targetId);
        links.push({ source: sourceId, target: targetId });
      }
    }
  }

  return { nodes, links };
}
