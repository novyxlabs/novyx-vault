import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { FsIndex } from "@/lib/storage/fs-index";

// Uses a real temp vault — this file intentionally does NOT mock fs/promises.

let dir: string;

async function writeFile(rel: string, content: string): Promise<void> {
  const full = path.join(dir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf-8");
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "fsindex-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("FsIndex.reindexAll — builds from disk", () => {
  it("derives backlinks, graph edges, and tags", async () => {
    await writeFile("a.md", "Links to [[B]] and [[C]] #project");
    await writeFile("b.md", "# B\nMentions [[C]] #project #draft");
    await writeFile("c.md", "# C\nno links");

    const idx = new FsIndex(dir);
    await idx.reindexAll();

    expect((await idx.getBacklinks("c", "c")).map((b) => b.path).sort()).toEqual([
      "a.md",
      "b.md",
    ]);
    expect((await idx.getBacklinks("b", "b")).map((b) => b.path)).toEqual(["a.md"]);

    const g = await idx.getGraph();
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    expect(g.links).toContainEqual({ source: "a", target: "b" });
    expect(g.links).toContainEqual({ source: "a", target: "c" });
    expect(g.links).toContainEqual({ source: "b", target: "c" });

    expect((await idx.getNotesByTag("project")).sort()).toEqual(["a", "b"]);
    expect(await idx.getNotesByTag("draft")).toEqual(["b"]);
  });
});

describe("FsIndex — incremental maintenance", () => {
  it("indexNote adds, then replaces, a note's edges and tags", async () => {
    const idx = new FsIndex(dir);
    await idx.reindexAll(); // empty vault

    await idx.indexNote("notes/x.md", "see [[Y]] #live", 1000);
    expect(await idx.getNotesByTag("live")).toEqual(["notes/x"]);
    expect(await idx.getBacklinks("y", "y")).toEqual([
      { name: "x", path: "notes/x.md", context: "see [[Y]] #live" },
    ]);

    // Re-index with new content: old link/tag gone, new ones present.
    await idx.indexNote("notes/x.md", "now [[Z]] #archived", 2000);
    expect(await idx.getBacklinks("y", "y")).toEqual([]);
    expect(await idx.getNotesByTag("live")).toEqual([]);
    expect(await idx.getNotesByTag("archived")).toEqual(["notes/x"]);

    await idx.flushNow(); // clear the debounced timer
  });

  it("unindexNote removes a note and all folder descendants", async () => {
    const idx = new FsIndex(dir);
    await idx.indexNote("proj/a.md", "[[T]] #x", 1);
    await idx.indexNote("proj/sub/b.md", "[[T]] #x", 1);
    await idx.indexNote("other.md", "[[T]] #x", 1);
    expect((await idx.getBacklinks("t", "t")).length).toBe(3);

    await idx.unindexNote("proj"); // folder delete

    expect((await idx.getBacklinks("t", "t")).map((b) => b.path)).toEqual(["other.md"]);
    expect(await idx.getNotesByTag("x")).toEqual(["other"]);

    await idx.flushNow();
  });
});

describe("FsIndex — persistence and reconciliation", () => {
  it("persists a sidecar and reloads from it", async () => {
    await writeFile("a.md", "[[B]] #t");
    await writeFile("b.md", "# B");
    const idx = new FsIndex(dir);
    await idx.reindexAll();

    const raw = await fs.readFile(path.join(dir, ".index.json"), "utf-8");
    expect(JSON.parse(raw).version).toBe(1);

    // A fresh instance loads the sidecar (reconcile sees matching mtimes).
    const idx2 = new FsIndex(dir);
    expect((await idx2.getBacklinks("b", "b")).map((b) => b.path)).toEqual(["a.md"]);
    expect(await idx2.getNotesByTag("t")).toEqual(["a"]);
  });

  it("reconcile picks up an external edit via mtime delta", async () => {
    await writeFile("a.md", "[[B]] #old");
    const idx = new FsIndex(dir);
    await idx.reindexAll();
    expect(await idx.getNotesByTag("old")).toEqual(["a"]);

    // Simulate an out-of-app edit: new content + bumped mtime.
    await writeFile("a.md", "[[B]] #new");
    const future = new Date(Date.now() + 10_000);
    await fs.utimes(path.join(dir, "a.md"), future, future);

    await idx.reconcile();

    expect(await idx.getNotesByTag("old")).toEqual([]);
    expect(await idx.getNotesByTag("new")).toEqual(["a"]);

    await idx.flushNow();
  });
});
