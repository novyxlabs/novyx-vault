import type { Backlink } from "../backlinks";
import type { GraphData } from "../graph";

/**
 * A single resolved/persisted link edge held by an index implementation.
 * (The parse-time shape is `ParsedLink` in ./resolve — this adds the source.)
 */
export interface IndexedLink {
  /** Note that contains the link (normalized path, no .md). */
  sourcePath: string;
  /** Wiki-link target, trimmed and lowercased. */
  targetRaw: string;
  /** The line the link appeared on, for backlink previews. */
  context: string;
}

/**
 * Optional indexing capability a StorageAdapter may implement to serve
 * backlink / graph / tag queries from a maintained index instead of a
 * full-vault scan. Mirrors the existing optional `searchNoteFiles?` pattern:
 * when absent, callers fall back to the legacy scan in lib/backlinks.ts,
 * lib/graph.ts, and lib/connections.ts.
 *
 * Read methods return the same shapes the scan path returns, so the dispatch
 * is transparent to consumers. Maintenance methods are invoked by the
 * adapter's own mutations (writeNote/deleteNote/renameNote) so the index can
 * never drift from the underlying notes.
 */
export interface NoteIndex {
  // --- Reads (replace the scans) ---
  /** Backlinks to a note, resolved by basename or full path. */
  getBacklinks(noteName: string, notePath: string): Promise<Backlink[]>;
  /** The full wiki-link graph (nodes + resolved edges). */
  getGraph(): Promise<GraphData>;
  /** Normalized paths (no .md) of notes carrying a given tag. */
  getNotesByTag(tag: string): Promise<string[]>;

  // --- Maintenance (called from adapter mutations) ---
  /** (Re)index a single note from its current content. */
  indexNote(notePath: string, content: string, mtimeMs?: number): Promise<void>;
  /** Drop a note from the index. */
  unindexNote(notePath: string): Promise<void>;
  /** Rebuild the entire index from scratch (backfill / repair). */
  reindexAll(): Promise<void>;
}
