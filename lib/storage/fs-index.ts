import fs from "fs/promises";
import path from "path";
import { parseLinks, parseTags } from "../index/resolve";
import type { Backlink } from "../backlinks";
import type { GraphData, GraphNode, GraphLink } from "../graph";

/**
 * Local (filesystem) note index — Phase 3 of the indexing engine.
 *
 * Backs the FsAdapter's NoteIndex methods. The process is long-lived (Tauri /
 * `next dev`), so the index lives in memory as inverted maps and is persisted
 * to a `.index.json` sidecar for fast cold-load. Only per-file facts are
 * persisted; the inverted maps are rebuilt from them on load.
 *
 * Consistency:
 * - In-app edits keep the index fresh via indexNote/unindexNote (FsAdapter
 *   mutations call these).
 * - External edits (git, Obsidian) are caught by mtime-delta reconciliation:
 *   on load, and at most once per RECONCILE_INTERVAL_MS on read. Reconcile
 *   stat()s every note (cheap) and only re-reads files whose mtime changed.
 *
 * Persistence is debounced and atomic (temp file + rename).
 */

const INDEX_VERSION = 1;
const FLUSH_DEBOUNCE_MS = 500;
const RECONCILE_INTERVAL_MS = 5000;

interface FileEntry {
  mtimeMs: number;
  name: string;
  /** Distinct wiki-link targets with first-seen line context. */
  links: { targetRaw: string; context: string }[];
  /** Distinct tag names. */
  tags: string[];
}

interface PersistedIndex {
  version: number;
  files: Record<string, FileEntry>; // key = note id (relPath without .md)
}

export class FsIndex {
  private readonly notesDir: string;
  private readonly indexPath: string;

  // Source of truth (persisted).
  private files = new Map<string, FileEntry>();

  // Derived inverted maps (rebuilt from `files`, never persisted).
  private backlinks = new Map<string, { sourceId: string; context: string }[]>();
  private tagIndex = new Map<string, Set<string>>();
  private nameToId = new Map<string, string>(); // nameLower  -> id
  private idLowerToId = new Map<string, string>(); // idLower -> id

  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private lastReconcileAt = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(notesDir: string) {
    this.notesDir = notesDir;
    this.indexPath = path.join(notesDir, ".index.json");
  }

  // --- NoteIndex reads ---

  async getBacklinks(noteName: string, notePath: string): Promise<Backlink[]> {
    await this.ensureReady();
    const nameNorm = noteName.toLowerCase();
    const pathNorm = notePath.toLowerCase().replace(/\.md$/, "");
    const keys = nameNorm === pathNorm ? [nameNorm] : [nameNorm, pathNorm];

    const seen = new Set<string>();
    const out: Backlink[] = [];
    for (const key of keys) {
      for (const { sourceId, context } of this.backlinks.get(key) ?? []) {
        if (sourceId.toLowerCase() === pathNorm) continue; // skip self-links
        if (seen.has(sourceId)) continue; // one entry per source
        seen.add(sourceId);
        out.push({ name: path.basename(sourceId), path: sourceId + ".md", context });
      }
    }
    out.sort((a, b) => a.path.localeCompare(b.path));
    return out;
  }

  async getGraph(): Promise<GraphData> {
    await this.ensureReady();
    const nodes: GraphNode[] = [];
    for (const [id, entry] of this.files) nodes.push({ id, name: entry.name });

    const links: GraphLink[] = [];
    for (const [sourceId, entry] of this.files) {
      const seen = new Set<string>();
      for (const { targetRaw } of entry.links) {
        // Resolve by name first, then by full path — same precedence as the scan.
        const targetId = this.nameToId.get(targetRaw) ?? this.idLowerToId.get(targetRaw);
        if (!targetId || targetId === sourceId || seen.has(targetId)) continue;
        seen.add(targetId);
        links.push({ source: sourceId, target: targetId });
      }
    }
    return { nodes, links };
  }

  async getNotesByTag(tag: string): Promise<string[]> {
    await this.ensureReady();
    return [...(this.tagIndex.get(tag.toLowerCase()) ?? [])];
  }

  // --- NoteIndex maintenance ---

  async indexNote(notePath: string, content: string, mtimeMs?: number): Promise<void> {
    await this.ensureLoaded();
    this.setEntry(this.toId(notePath), content, mtimeMs ?? Date.now());
    this.scheduleFlush();
  }

  async unindexNote(notePath: string): Promise<void> {
    await this.ensureLoaded();
    const id = this.toId(notePath);
    const prefix = id + "/";
    let changed = false;
    for (const key of [...this.files.keys()]) {
      // Remove the note itself, plus any descendants (folder deletes).
      if (key === id || key.startsWith(prefix)) {
        this.removeFromMaps(key);
        this.files.delete(key);
        changed = true;
      }
    }
    if (changed) this.scheduleFlush();
  }

  async reindexAll(): Promise<void> {
    await this.rebuild();
    this.loaded = true;
    await this.flushNow();
  }

  /** Force an mtime-delta reconciliation (used after renames). */
  async reconcile(): Promise<void> {
    this.lastReconcileAt = Date.now();
    const current = await this.statWalk();
    let dirty = false;

    for (const id of [...this.files.keys()]) {
      if (!current.has(id)) {
        this.removeFromMaps(id);
        this.files.delete(id);
        dirty = true;
      }
    }
    for (const [id, info] of current) {
      const existing = this.files.get(id);
      if (existing && existing.mtimeMs === info.mtimeMs) continue;
      try {
        const content = await fs.readFile(info.full, "utf-8");
        this.setEntry(id, content, info.mtimeMs);
        dirty = true;
      } catch {
        // unreadable — skip
      }
    }
    if (dirty) this.scheduleFlush();
  }

  // --- Loading / building ---

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loadPromise ??= this.load();
    await this.loadPromise;
  }

  private async ensureReady(): Promise<void> {
    await this.ensureLoaded();
    if (Date.now() - this.lastReconcileAt > RECONCILE_INTERVAL_MS) {
      await this.reconcile();
    }
  }

  private async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.indexPath, "utf-8");
      const data = JSON.parse(raw) as PersistedIndex;
      if (data.version === INDEX_VERSION && data.files) {
        this.files = new Map(Object.entries(data.files));
        this.rebuildMaps();
        this.loaded = true;
        await this.reconcile(); // pick up edits since the sidecar was written
        return;
      }
    } catch {
      // missing / unreadable / stale version — rebuild from scratch
    }
    await this.rebuild();
    this.loaded = true;
    this.scheduleFlush();
  }

  private async rebuild(): Promise<void> {
    const current = await this.statWalk();
    this.files.clear();
    for (const [id, info] of current) {
      try {
        const content = await fs.readFile(info.full, "utf-8");
        this.files.set(id, this.parseEntry(id, content, info.mtimeMs));
      } catch {
        // skip unreadable files
      }
    }
    this.rebuildMaps();
    this.lastReconcileAt = Date.now();
  }

  // --- Map maintenance ---

  private parseEntry(id: string, content: string, mtimeMs: number): FileEntry {
    const seen = new Set<string>();
    const links: { targetRaw: string; context: string }[] = [];
    for (const l of parseLinks(content)) {
      if (seen.has(l.targetRaw)) continue;
      seen.add(l.targetRaw);
      links.push({ targetRaw: l.targetRaw, context: l.context });
    }
    return { mtimeMs, name: path.basename(id), links, tags: parseTags(content) };
  }

  private setEntry(id: string, content: string, mtimeMs: number): void {
    const old = this.files.get(id);
    if (old) this.removeFromMaps(id, old);
    const entry = this.parseEntry(id, content, mtimeMs);
    this.files.set(id, entry);
    this.addToMaps(id, entry);
  }

  private rebuildMaps(): void {
    this.backlinks.clear();
    this.tagIndex.clear();
    this.nameToId.clear();
    this.idLowerToId.clear();
    for (const [id, entry] of this.files) this.addToMaps(id, entry);
  }

  private addToMaps(id: string, entry: FileEntry): void {
    for (const l of entry.links) {
      const arr = this.backlinks.get(l.targetRaw);
      if (arr) arr.push({ sourceId: id, context: l.context });
      else this.backlinks.set(l.targetRaw, [{ sourceId: id, context: l.context }]);
    }
    for (const tag of entry.tags) {
      const set = this.tagIndex.get(tag);
      if (set) set.add(id);
      else this.tagIndex.set(tag, new Set([id]));
    }
    this.nameToId.set(entry.name.toLowerCase(), id);
    this.idLowerToId.set(id.toLowerCase(), id);
  }

  private removeFromMaps(id: string, entry?: FileEntry): void {
    const e = entry ?? this.files.get(id);
    if (!e) return;
    for (const l of e.links) {
      const arr = this.backlinks.get(l.targetRaw);
      if (!arr) continue;
      const filtered = arr.filter((x) => x.sourceId !== id);
      if (filtered.length) this.backlinks.set(l.targetRaw, filtered);
      else this.backlinks.delete(l.targetRaw);
    }
    for (const tag of e.tags) {
      const set = this.tagIndex.get(tag);
      if (set) {
        set.delete(id);
        if (!set.size) this.tagIndex.delete(tag);
      }
    }
    // Maps are last-write-wins; only clear if they still point at this id.
    // (Colliding basenames resolve on the next full rebuild — same ambiguity
    // the legacy scan had.)
    if (this.nameToId.get(e.name.toLowerCase()) === id) this.nameToId.delete(e.name.toLowerCase());
    if (this.idLowerToId.get(id.toLowerCase()) === id) this.idLowerToId.delete(id.toLowerCase());
  }

  // --- Filesystem helpers ---

  /** Walk the vault collecting note ids + mtimes (no content reads). */
  private async statWalk(): Promise<Map<string, { mtimeMs: number; full: string }>> {
    const out = new Map<string, { mtimeMs: number; full: string }>();
    const walkDir = async (dir: string, base: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue; // skips .trash, .history, .index.json
        const full = path.join(dir, entry.name);
        const rel = base ? `${base}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await walkDir(full, rel);
        } else if (entry.name.endsWith(".md")) {
          try {
            const st = await fs.stat(full);
            out.set(rel.replace(/\.md$/, ""), { mtimeMs: st.mtimeMs, full });
          } catch {
            // skip
          }
        }
      }
    };
    await walkDir(this.notesDir, "");
    return out;
  }

  private toId(notePath: string): string {
    return notePath.replace(/\\/g, "/").replace(/\.md$/, "");
  }

  // --- Persistence (debounced + atomic) ---

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushNow().catch(() => {});
    }, FLUSH_DEBOUNCE_MS);
    // Don't keep the process alive solely for a pending flush.
    this.flushTimer.unref?.();
  }

  async flushNow(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const data: PersistedIndex = {
      version: INDEX_VERSION,
      files: Object.fromEntries(this.files),
    };
    const tmp = this.indexPath + ".tmp";
    try {
      await fs.writeFile(tmp, JSON.stringify(data), "utf-8");
      await fs.rename(tmp, this.indexPath);
    } catch (e) {
      console.warn("[index] flush failed:", e);
    }
  }
}
