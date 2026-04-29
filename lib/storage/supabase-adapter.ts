import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "../supabase";
import type { StorageAdapter, NoteEntry, TrashEntry, NoteFile, SearchFilters } from "./types";
import { validateNotePath, tryValidateNotePath } from "./path-validator";

export class SupabaseAdapter implements StorageAdapter {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(userId: string, cookieHeader?: string) {
    this.userId = userId;
    this.supabase = createServerSupabase(cookieHeader);
  }

  /**
   * Get the parent directory from a path.
   * "folder/subfolder/note.md" → "folder/subfolder"
   * "note.md" → ""
   */
  private parentDir(p: string): string {
    const idx = p.lastIndexOf("/");
    return idx === -1 ? "" : p.substring(0, idx);
  }

  private assertNoError(error: { message: string } | null | undefined, fallback: string): void {
    if (error) throw new Error(error.message || fallback);
  }

  private async updateById(id: string, updates: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from("notes")
      .update(updates)
      .eq("id", id);
    this.assertNoError(error, `Failed to update note ${id}`);
  }

  async listNotes(dirPath = ""): Promise<NoteEntry[]> {
    // Single query: fetch all non-trashed notes, then build tree in-memory
    const { data, error } = await this.supabase
      .from("notes")
      .select("id, path, name, is_folder, modified_at")
      .eq("user_id", this.userId)
      .eq("is_trashed", false)
      .order("name");

    if (error) throw new Error(error.message);
    if (!data) return [];

    return this.buildTree(data, dirPath);
  }

  /** Build a nested tree from a flat list of rows (no additional queries) */
  private buildTree(
    rows: { id: string; path: string; name: string; is_folder: boolean; modified_at: string }[],
    dirPath: string
  ): NoteEntry[] {
    const normalizedDir = dirPath.replace(/^\/+|\/+$/g, "");

    // Group rows by their parent directory
    const childrenByParent = new Map<string, typeof rows>();
    for (const row of rows) {
      const parent = this.parentDir(row.path);
      let list = childrenByParent.get(parent);
      if (!list) {
        list = [];
        childrenByParent.set(parent, list);
      }
      list.push(row);
    }

    const build = (dir: string): NoteEntry[] => {
      const directChildren = childrenByParent.get(dir) ?? [];
      const result: NoteEntry[] = directChildren.map((row) => {
        if (row.is_folder) {
          return {
            name: row.name,
            path: row.path,
            isFolder: true as const,
            children: build(row.path),
            modifiedAt: row.modified_at,
          };
        }
        return {
          name: row.name,
          path: row.path,
          isFolder: false as const,
          modifiedAt: row.modified_at,
        };
      });

      result.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return result;
    };

    return build(normalizedDir);
  }

  async readNote(notePath: string): Promise<string> {
    const safePath = validateNotePath(notePath);
    const normalized = safePath.replace(/\.md$/, "");
    const { data, error } = await this.supabase
      .from("notes")
      .select("content")
      .eq("user_id", this.userId)
      .eq("is_trashed", false)
      .or(`path.eq.${normalized},path.eq.${normalized}.md`)
      .single();

    if (error || !data) throw new Error(`Note not found: ${notePath}`);
    return data.content ?? "";
  }

  async writeNote(notePath: string, content: string): Promise<void> {
    const safePath = validateNotePath(notePath);
    const normalized = safePath.replace(/\.md$/, "");
    const name = normalized.split("/").pop() ?? normalized;

    // Ensure parent folders exist
    await this.ensureFolders(normalized);

    const now = new Date().toISOString();
    const { data: existing, error: lookupError } = await this.supabase
      .from("notes")
      .select("id")
      .eq("user_id", this.userId)
      .eq("path", normalized)
      .eq("is_trashed", false)
      .maybeSingle();
    this.assertNoError(lookupError, `Failed to find note ${normalized}`);

    if (existing?.id) {
      await this.updateById(existing.id, {
        name,
        content,
        is_folder: false,
        modified_at: now,
      });
      return;
    }

    const { error } = await this.supabase.from("notes").insert({
      user_id: this.userId,
      path: normalized,
      name,
      content,
      is_folder: false,
      is_trashed: false,
      modified_at: now,
    });
    this.assertNoError(error, `Failed to create note ${normalized}`);
  }

  private async ensureFolders(notePath: string): Promise<void> {
    const parts = notePath.split("/");
    if (parts.length <= 1) return; // No parent folders needed

    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join("/");
      const folderName = parts[i - 1];

      const { data } = await this.supabase
        .from("notes")
        .select("id")
        .eq("user_id", this.userId)
        .eq("path", folderPath)
        .eq("is_folder", true)
        .eq("is_trashed", false)
        .single();

      if (!data) {
        const { error } = await this.supabase.from("notes").insert({
          user_id: this.userId,
          path: folderPath,
          name: folderName,
          is_folder: true,
        });
        this.assertNoError(error, `Failed to create folder ${folderPath}`);
      }
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    const normalized = validateNotePath(folderPath).replace(/\/+$/g, "");
    const name = normalized.split("/").pop() ?? normalized;

    await this.ensureFolders(normalized);

    const { data } = await this.supabase
      .from("notes")
      .select("id")
      .eq("user_id", this.userId)
      .eq("path", normalized)
      .eq("is_folder", true)
      .eq("is_trashed", false)
      .single();

    if (!data) {
      const { error } = await this.supabase.from("notes").insert({
        user_id: this.userId,
        path: normalized,
        name,
        is_folder: true,
      });
      if (error) throw new Error(error.message);
    }
  }

  async deleteNote(notePath: string): Promise<void> {
    const safePath = validateNotePath(notePath);
    const normalized = safePath.replace(/\.md$/, "");

    // Check if it's a folder — if so, trash all children too
    const { data: target } = await this.supabase
      .from("notes")
      .select("id, is_folder, path")
      .eq("user_id", this.userId)
      .eq("is_trashed", false)
      .or(`path.eq.${normalized},path.eq.${normalized}.md`)
      .single();

    if (!target) throw new Error(`Note not found: ${notePath}`);

    const now = new Date().toISOString();

    if (target.is_folder) {
      const { data: children } = await this.supabase
        .from("notes")
        .select("id, path")
        .eq("user_id", this.userId)
        .eq("is_trashed", false)
        .like("path", `${target.path}/%`);

      const updatedChildren: string[] = [];
      try {
        for (const child of children || []) {
          await this.updateById(child.id, {
            is_trashed: true,
            trashed_at: now,
            original_path: child.path,
            is_published: false,
            slug: null,
            published_at: null,
          });
          updatedChildren.push(child.id);
        }
      } catch (error) {
        for (const childId of updatedChildren.reverse()) {
          await this.updateById(childId, {
            is_trashed: false,
            trashed_at: null,
            original_path: null,
          }).catch(() => {});
        }
        throw error;
      }
    }

    await this.updateById(target.id, {
      is_trashed: true,
      trashed_at: now,
      original_path: target.path,
      is_published: false,
      slug: null,
      published_at: null,
    });
  }

  async renameNote(oldPath: string, newPath: string): Promise<void> {
    const safeOldPath = validateNotePath(oldPath);
    const safeNewPath = validateNotePath(newPath);
    const normalizedOld = safeOldPath.replace(/\.md$/, "");
    const normalizedNew = safeNewPath.replace(/\.md$/, "");
    const newName = normalizedNew.split("/").pop() ?? normalizedNew;

    // Ensure new parent folders exist
    await this.ensureFolders(normalizedNew);

    const { data: target } = await this.supabase
      .from("notes")
      .select("id, is_folder")
      .eq("user_id", this.userId)
      .eq("path", normalizedOld)
      .eq("is_trashed", false)
      .single();

    if (!target) throw new Error(`Note not found: ${oldPath}`);

    await this.updateById(target.id, { path: normalizedNew, name: newName });

    if (target.is_folder) {
      const { data: children } = await this.supabase
        .from("notes")
        .select("id, path")
        .eq("user_id", this.userId)
        .eq("is_trashed", false)
        .like("path", `${normalizedOld}/%`);
      const updatedChildren: Array<{ id: string; path: string }> = [];
      try {
        for (const child of children || []) {
          const updatedPath = normalizedNew + child.path.slice(normalizedOld.length);
          await this.updateById(child.id, { path: updatedPath });
          updatedChildren.push({ id: child.id, path: child.path });
        }
      } catch (error) {
        await this.updateById(target.id, { path: normalizedOld, name: normalizedOld.split("/").pop() ?? normalizedOld }).catch(() => {});
        for (const child of updatedChildren.reverse()) {
          await this.updateById(child.id, { path: child.path }).catch(() => {});
        }
        throw error;
      }
    }
  }

  async listTrash(): Promise<TrashEntry[]> {
    const { data, error } = await this.supabase
      .from("notes")
      .select("id, name, original_path, trashed_at, is_folder")
      .eq("user_id", this.userId)
      .eq("is_trashed", true)
      .order("trashed_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      originalPath: row.original_path ?? row.name,
      deletedAt: row.trashed_at ?? new Date().toISOString(),
      isFolder: row.is_folder,
    }));
  }

  async restoreFromTrash(id: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("notes")
      .select("id, original_path, path, is_folder")
      .eq("id", id)
      .eq("user_id", this.userId)
      .eq("is_trashed", true)
      .single();

    if (error || !data) throw new Error("Trash entry not found");

    const restorePath = data.original_path ?? data.path;

    await this.updateById(id, {
      is_trashed: false,
      trashed_at: null,
      path: restorePath,
      is_published: false,
      slug: null,
      published_at: null,
    });

    if (data.is_folder) {
      const { data: children } = await this.supabase
        .from("notes")
        .select("id, original_path, path")
        .eq("user_id", this.userId)
        .eq("is_trashed", true)
        .or(`original_path.like.${restorePath}/%,path.like.${restorePath}/%`);
      const restoredChildren: Array<{ id: string; path: string }> = [];
      try {
        for (const child of children || []) {
          const childRestore = child.original_path ?? child.path;
          await this.updateById(child.id, {
            is_trashed: false,
            trashed_at: null,
            path: childRestore,
            is_published: false,
            slug: null,
            published_at: null,
          });
          restoredChildren.push({ id: child.id, path: child.path });
        }
      } catch (error) {
        await this.updateById(id, {
          is_trashed: true,
          trashed_at: new Date().toISOString(),
          path: data.path,
        }).catch(() => {});
        for (const child of restoredChildren.reverse()) {
          await this.updateById(child.id, {
            is_trashed: true,
            trashed_at: new Date().toISOString(),
            path: child.path,
          }).catch(() => {});
        }
        throw error;
      }
    }

    return restorePath;
  }

  async purgeFromTrash(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId)
      .eq("is_trashed", true);

    if (error) throw new Error(error.message);
  }

  async emptyTrash(): Promise<void> {
    const { error } = await this.supabase
      .from("notes")
      .delete()
      .eq("user_id", this.userId)
      .eq("is_trashed", true);

    if (error) throw new Error(error.message);
  }

  async walkAllNotes(): Promise<NoteFile[]> {
    const { data, error } = await this.supabase
      .from("notes")
      .select("path, name, content, modified_at")
      .eq("user_id", this.userId)
      .eq("is_trashed", false)
      .eq("is_folder", false)
      .order("path");

    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row) => ({
      relPath: row.path.endsWith(".md") ? row.path : row.path + ".md",
      name: row.name,
      content: row.content ?? "",
      modifiedAt: new Date(row.modified_at),
    }));
  }

  async searchNoteFiles(query: string, maxResults = 20, filters: SearchFilters = {}): Promise<NoteFile[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    let request = this.supabase
      .from("notes")
      .select("path, name, content, modified_at")
      .eq("user_id", this.userId)
      .eq("is_trashed", false)
      .eq("is_folder", false)
      .textSearch("fts", trimmed, { type: "websearch", config: "english" });

    if (filters.folder) {
      const folder = filters.folder.replace(/^\/+|\/+$/g, "");
      if (folder) request = request.like("path", `${folder}/%`);
    }

    if (filters.tag) {
      request = request.ilike("content", `%#${filters.tag}%`);
    }

    const { data, error } = await request
      .order("modified_at", { ascending: false })
      .limit(maxResults);
    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map((row) => ({
      relPath: row.path.endsWith(".md") ? row.path : row.path + ".md",
      name: row.name,
      content: row.content ?? "",
      modifiedAt: new Date(row.modified_at),
    }));
  }

  async exportAll(): Promise<{ name: string; data: Buffer }[]> {
    const notes = await this.walkAllNotes();
    const out: { name: string; data: Buffer }[] = [];
    for (const n of notes) {
      // Strip .md to validate the logical path, then restore it.
      // Pre-existing notes in the DB may have been written before the
      // shared validator landed, so we defensively re-check here to
      // prevent ZIP-slip in the exported archive. Any note with a path
      // that fails validation is skipped (never dropped silently —
      // logged so admins can investigate and clean up).
      const logical = n.relPath.replace(/\.md$/, "");
      const safe = tryValidateNotePath(logical);
      if (safe === null) {
        console.warn(
          `[export] skipping note with invalid path: ${JSON.stringify(n.relPath)}`
        );
        continue;
      }
      out.push({
        name: safe + ".md",
        data: Buffer.from(n.content, "utf-8"),
      });
    }
    return out;
  }

  async listVersions(notePath: string): Promise<{ timestamp: number; filename: string }[]> {
    const normalized = validateNotePath(notePath).replace(/\.md$/, "");

    // Find the note ID
    const { data: note } = await this.supabase
      .from("notes")
      .select("id")
      .eq("user_id", this.userId)
      .or(`path.eq.${normalized},path.eq.${normalized}.md`)
      .single();

    if (!note) return [];

    const { data, error } = await this.supabase
      .from("note_versions")
      .select("timestamp")
      .eq("note_id", note.id)
      .eq("user_id", this.userId)
      .order("timestamp", { ascending: false })
      .limit(30);

    if (error || !data) return [];

    return data.map((row) => ({
      timestamp: row.timestamp,
      filename: `${row.timestamp}.md`,
    }));
  }

  async readVersion(notePath: string, timestamp: string): Promise<string> {
    const normalized = validateNotePath(notePath).replace(/\.md$/, "");

    const { data: note } = await this.supabase
      .from("notes")
      .select("id")
      .eq("user_id", this.userId)
      .or(`path.eq.${normalized},path.eq.${normalized}.md`)
      .single();

    if (!note) throw new Error(`Note not found: ${notePath}`);

    const { data, error } = await this.supabase
      .from("note_versions")
      .select("content")
      .eq("note_id", note.id)
      .eq("user_id", this.userId)
      .eq("timestamp", parseInt(timestamp, 10))
      .single();

    if (error || !data) throw new Error(`Version not found: ${timestamp}`);
    return data.content;
  }

  async saveVersion(notePath: string, content: string): Promise<number> {
    const normalized = validateNotePath(notePath).replace(/\.md$/, "");

    const { data: note } = await this.supabase
      .from("notes")
      .select("id")
      .eq("user_id", this.userId)
      .or(`path.eq.${normalized},path.eq.${normalized}.md`)
      .single();

    if (!note) throw new Error(`Note not found: ${notePath}`);

    const ts = Date.now();

    const { error } = await this.supabase.from("note_versions").insert({
      note_id: note.id,
      user_id: this.userId,
      content,
      timestamp: ts,
    });

    if (error) throw new Error(error.message);

    // Prune old versions (keep last 50)
    const { data: versions } = await this.supabase
      .from("note_versions")
      .select("id, timestamp")
      .eq("note_id", note.id)
      .order("timestamp", { ascending: false });

    if (versions && versions.length > 50) {
      const toDelete = versions.slice(50).map((v) => v.id);
      await this.supabase
        .from("note_versions")
        .delete()
        .in("id", toDelete);
    }

    return ts;
  }
}
