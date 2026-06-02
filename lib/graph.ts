import path from "path";
import { getStorage } from "./storage";
import type { StorageAdapter } from "./storage";
import type { StorageContext } from "./notes";
import { parseLinkTargets } from "./index/resolve";

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

  // Indexed path: O(E) resolved edges when the adapter maintains an index.
  if (typeof storage.getGraph === "function") {
    return storage.getGraph();
  }

  return scanGraph(storage);
}

/** Legacy fallback: walk every note and resolve wiki-links to build the graph. */
async function scanGraph(storage: StorageAdapter): Promise<GraphData> {
  const notes = await storage.walkAllNotes();

  // Lookup: lowercased name (without .md) -> note path (without .md)
  const nameToPath = new Map<string, string>();
  for (const note of notes) {
    const notePath = note.relPath.replace(/\.md$/, "");
    nameToPath.set(path.basename(notePath).toLowerCase(), notePath);
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // One node per file
  for (const note of notes) {
    const id = note.relPath.replace(/\.md$/, "");
    nodes.push({ id, name: path.basename(id) });
  }

  // Resolve wiki-links to edges
  for (const note of notes) {
    const sourceId = note.relPath.replace(/\.md$/, "");
    const seen = new Set<string>();

    for (const target of parseLinkTargets(note.content)) {
      // Resolve: try name match first, then full-path match.
      let targetId = nameToPath.get(target);
      if (!targetId) {
        for (const notePath of nameToPath.values()) {
          if (notePath.toLowerCase() === target) {
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
