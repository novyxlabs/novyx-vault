import fs from "fs/promises";
import path from "path";
import os from "os";
import type { StorageAdapter, NoteEntry, TrashEntry, NoteFile } from "./types";

const NOTES_DIR = path.join(os.homedir(), "SecondBrain");
const TRASH_DIR = path.join(NOTES_DIR, ".trash");
const HISTORY_DIR = path.join(NOTES_DIR, ".history");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function sanitizePath(inputPath: string): string {
  const resolved = path.resolve(NOTES_DIR, inputPath);
  // Use NOTES_DIR + separator to prevent sibling-prefix bypass
  // (e.g. /Users/.../SecondBrain-backup matching /Users/.../SecondBrain)
  if (resolved !== NOTES_DIR && !resolved.startsWith(NOTES_DIR + path.sep)) {
    throw new Error("Invalid path: outside notes directory");
  }
  return resolved;
}

function sanitizeRelativePath(p: string): string {
  return p.replace(/\.\./g, "").replace(/^\/+/, "");
}

export class FsAdapter implements StorageAdapter {
  async listNotes(dirPath = ""): Promise<NoteEntry[]> {
    const fullPath = sanitizePath(dirPath);
    await ensureDir(fullPath);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const result: NoteEntry[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const entryPath = path.join(dirPath, entry.name);
      const fullEntryPath = path.join(fullPath, entry.name);
      const stat = await fs.stat(fullEntryPath);

      if (entry.isDirectory()) {
        const children = await this.listNotes(entryPath);
        result.push({
          name: entry.name,
          path: entryPath,
          isFolder: true,
          children,
          modifiedAt: stat.mtime.toISOString(),
        });
      } else if (entry.name.endsWith(".md")) {
        result.push({
          name: entry.name.replace(/\.md$/, ""),
          path: entryPath,
          isFolder: false,
          modifiedAt: stat.mtime.toISOString(),
        });
      }
    }

    result.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }

  async readNote(notePath: string): Promise<string> {
    const fullPath = sanitizePath(notePath);
    const resolvedPath = fullPath.endsWith(".md") ? fullPath : fullPath + ".md";
    return fs.readFile(resolvedPath, "utf-8");
  }

  async writeNote(notePath: string, content: string): Promise<void> {
    const fullPath = sanitizePath(notePath);
    const resolvedPath = fullPath.endsWith(".md") ? fullPath : fullPath + ".md";
    await ensureDir(path.dirname(resolvedPath));
    await fs.writeFile(resolvedPath, content, "utf-8");
  }

  async createFolder(folderPath: string): Promise<void> {
    const fullPath = sanitizePath(folderPath);
    await ensureDir(fullPath);
  }

  async deleteNote(notePath: string): Promise<void> {
    const fullPath = sanitizePath(notePath);
    let sourcePath = fullPath;
    const stat = await fs.stat(fullPath).catch(() => null);

    if (!stat) {
      const mdPath = fullPath + ".md";
      await fs.stat(mdPath); // throws if not found
      sourcePath = mdPath;
    }

    await ensureDir(TRASH_DIR);
    const timestamp = Date.now();
    const baseName = path.basename(sourcePath);
    const trashName = `${timestamp}_${baseName}`;
    const trashPath = path.join(TRASH_DIR, trashName);
    await fs.rename(sourcePath, trashPath);

    const meta = { originalPath: notePath, deletedAt: new Date().toISOString(), fileName: baseName };
    await fs.writeFile(trashPath + ".meta.json", JSON.stringify(meta), "utf-8");
  }

  async renameNote(oldPath: string, newPath: string): Promise<void> {
    let fullOldPath = sanitizePath(oldPath);
    let fullNewPath = sanitizePath(newPath);

    // Check if old path is a file (not a folder)
    const stat = await fs.stat(fullOldPath).catch(() => null);
    if (!stat) {
      // Try with .md extension
      fullOldPath = fullOldPath + ".md";
      await fs.stat(fullOldPath); // throws if truly not found
    }

    const oldStat = stat ?? await fs.stat(fullOldPath);

    // If renaming a file, ensure .md extension is preserved
    if (!oldStat.isDirectory() && !fullNewPath.endsWith(".md")) {
      fullNewPath = fullNewPath + ".md";
    }

    await ensureDir(path.dirname(fullNewPath));
    await fs.rename(fullOldPath, fullNewPath);
  }

  async listTrash(): Promise<TrashEntry[]> {
    await ensureDir(TRASH_DIR);
    const entries = await fs.readdir(TRASH_DIR);
    const result: TrashEntry[] = [];

    for (const entry of entries) {
      if (entry.endsWith(".meta.json")) continue;
      const metaPath = path.join(TRASH_DIR, entry + ".meta.json");
      try {
        const metaRaw = await fs.readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaRaw);
        const stat = await fs.stat(path.join(TRASH_DIR, entry));
        result.push({
          id: entry,
          name: meta.fileName || entry,
          originalPath: meta.originalPath,
          deletedAt: meta.deletedAt,
          isFolder: stat.isDirectory(),
        });
      } catch {
        // Skip entries without valid metadata
      }
    }

    result.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    return result;
  }

  async restoreFromTrash(id: string): Promise<string> {
    const trashPath = path.join(TRASH_DIR, id);
    const metaPath = trashPath + ".meta.json";
    const metaRaw = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw);

    const restorePath = sanitizePath(meta.originalPath);
    const resolvedRestore = restorePath.endsWith(".md") ? restorePath : restorePath + ".md";
    const stat = await fs.stat(trashPath);

    await ensureDir(path.dirname(stat.isDirectory() ? restorePath : resolvedRestore));
    await fs.rename(trashPath, stat.isDirectory() ? restorePath : resolvedRestore);
    await fs.unlink(metaPath).catch(() => {});
    return meta.originalPath;
  }

  async purgeFromTrash(id: string): Promise<void> {
    const trashPath = path.join(TRASH_DIR, id);
    const metaPath = trashPath + ".meta.json";
    const stat = await fs.stat(trashPath);
    if (stat.isDirectory()) {
      await fs.rm(trashPath, { recursive: true });
    } else {
      await fs.unlink(trashPath);
    }
    await fs.unlink(metaPath).catch(() => {});
  }

  async emptyTrash(): Promise<void> {
    await ensureDir(TRASH_DIR);
    const entries = await fs.readdir(TRASH_DIR);
    for (const entry of entries) {
      const fullPath = path.join(TRASH_DIR, entry);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
    }
  }

  async walkAllNotes(): Promise<NoteFile[]> {
    const results: NoteFile[] = [];

    async function walk(dir: string, base: string) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(base, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, relPath);
        } else if (entry.name.endsWith(".md")) {
          try {
            const [content, stat] = await Promise.all([
              fs.readFile(fullPath, "utf-8"),
              fs.stat(fullPath),
            ]);
            results.push({
              relPath,
              name: entry.name.replace(/\.md$/, ""),
              content,
              modifiedAt: stat.mtime,
            });
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    await walk(NOTES_DIR, "");
    return results;
  }

  async exportAll(): Promise<{ name: string; data: Buffer }[]> {
    const entries: { name: string; data: Buffer }[] = [];

    async function walk(dir: string, base: string) {
      let items;
      try {
        items = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const item of items) {
        if (item.name.startsWith(".")) continue;
        const fullPath = path.join(dir, item.name);
        const relPath = base ? `${base}/${item.name}` : item.name;
        if (item.isDirectory()) {
          await walk(fullPath, relPath);
        } else if (item.name.endsWith(".md")) {
          const data = await fs.readFile(fullPath);
          entries.push({ name: relPath, data });
        }
      }
    }

    await walk(NOTES_DIR, "");
    return entries;
  }

  async listVersions(notePath: string): Promise<{ timestamp: number; filename: string }[]> {
    const safePath = sanitizeRelativePath(notePath);
    const histDir = path.join(HISTORY_DIR, safePath);
    try {
      const files = await fs.readdir(histDir);
      return files
        .filter((f) => f.endsWith(".md"))
        .map((f) => ({
          timestamp: parseInt(f.replace(".md", ""), 10),
          filename: f,
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 30);
    } catch {
      return [];
    }
  }

  async readVersion(notePath: string, timestamp: string): Promise<string> {
    const safePath = sanitizeRelativePath(notePath);
    const filePath = path.join(HISTORY_DIR, safePath, `${timestamp}.md`);
    return fs.readFile(filePath, "utf-8");
  }

  async saveVersion(notePath: string, content: string): Promise<number> {
    const safePath = sanitizeRelativePath(notePath);
    const histDir = path.join(HISTORY_DIR, safePath);
    await fs.mkdir(histDir, { recursive: true });

    const ts = Date.now();
    await fs.writeFile(path.join(histDir, `${ts}.md`), content, "utf-8");

    // Prune old versions (keep last 50)
    const files = await fs.readdir(histDir);
    const sorted = files
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    for (const old of sorted.slice(50)) {
      await fs.unlink(path.join(histDir, old)).catch(() => {});
    }

    return ts;
  }
}
