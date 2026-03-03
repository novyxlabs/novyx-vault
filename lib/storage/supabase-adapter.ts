import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "../supabase";
import type { StorageAdapter, NoteEntry, TrashEntry, NoteFile } from "./types";

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

  async listNotes(dirPath = ""): Promise<NoteEntry[]> {
    // Get all non-trashed notes for this user
    const { data, error } = await this.supabase
      .from("notes")
      .select("id, path, name, is_folder, modified_at")
      .eq("user_id", this.userId)
      .eq("is_trashed", false)
      .order("name");

    if (error) throw new Error(error.message);
    if (!data) return [];

    // Filter to entries whose parent matches dirPath
    const normalizedDir = dirPath.replace(/^\/+|\/+$/g, "");
    const directChildren = data.filter((row) => {
      const parent = this.parentDir(row.path);
      return parent === normalizedDir;
    });

    const result: NoteEntry[] = [];
    for (const row of directChildren) {
      if (row.is_folder) {
        const children = await this.listNotes(row.path);
        result.push({
          name: row.name,
          path: row.path,
          isFolder: true,
          children,
          modifiedAt: row.modified_at,
        });
      } else {
        result.push({
          name: row.name,
          path: row.path,
          isFolder: false,
          modifiedAt: row.modified_at,
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
    const normalized = notePath.replace(/\.md$/, "");
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
    const normalized = notePath.replace(/\.md$/, "");
    const name = normalized.split("/").pop() ?? normalized;

    // Upsert: update if exists, insert if not
    const { data: existing } = await this.supabase
      .from("notes")
      .select("id")
      .eq("user_id", this.userId)
      .eq("path", normalized)
      .eq("is_trashed", false)
      .single();

    if (existing) {
      const { error } = await this.supabase
        .from("notes")
        .update({ content, modified_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      // Ensure parent folders exist
      await this.ensureFolders(normalized);

      const { error } = await this.supabase.from("notes").insert({
        user_id: this.userId,
        path: normalized,
        name,
        content,
        is_folder: false,
        modified_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    }
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
        await this.supabase.from("notes").insert({
          user_id: this.userId,
          path: folderPath,
          name: folderName,
          is_folder: true,
        });
      }
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    const normalized = folderPath.replace(/^\/+|\/+$/g, "");
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
    const normalized = notePath.replace(/\.md$/, "");

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
      // Trash the folder and all children
      await this.supabase
        .from("notes")
        .update({
          is_trashed: true,
          trashed_at: now,
          original_path: target.path,
        })
        .eq("user_id", this.userId)
        .eq("is_trashed", false)
        .like("path", `${target.path}/%`);
    }

    // Trash the note/folder itself
    const { error } = await this.supabase
      .from("notes")
      .update({
        is_trashed: true,
        trashed_at: now,
        original_path: target.path,
      })
      .eq("id", target.id);

    if (error) throw new Error(error.message);
  }

  async renameNote(oldPath: string, newPath: string): Promise<void> {
    const normalizedOld = oldPath.replace(/\.md$/, "");
    const normalizedNew = newPath.replace(/\.md$/, "");
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

    // Update the note itself
    const { error } = await this.supabase
      .from("notes")
      .update({ path: normalizedNew, name: newName })
      .eq("id", target.id);

    if (error) throw new Error(error.message);

    // If it's a folder, update all children's paths
    if (target.is_folder) {
      const { data: children } = await this.supabase
        .from("notes")
        .select("id, path")
        .eq("user_id", this.userId)
        .eq("is_trashed", false)
        .like("path", `${normalizedOld}/%`);

      if (children) {
        for (const child of children) {
          const updatedPath = normalizedNew + child.path.slice(normalizedOld.length);
          await this.supabase
            .from("notes")
            .update({ path: updatedPath })
            .eq("id", child.id);
        }
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
      .select("id, original_path, path")
      .eq("id", id)
      .eq("user_id", this.userId)
      .eq("is_trashed", true)
      .single();

    if (error || !data) throw new Error("Trash entry not found");

    const restorePath = data.original_path ?? data.path;

    const { error: updateError } = await this.supabase
      .from("notes")
      .update({
        is_trashed: false,
        trashed_at: null,
        path: restorePath,
      })
      .eq("id", id);

    if (updateError) throw new Error(updateError.message);
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

  async exportAll(): Promise<{ name: string; data: Buffer }[]> {
    const notes = await this.walkAllNotes();
    return notes.map((n) => ({
      name: n.relPath,
      data: Buffer.from(n.content, "utf-8"),
    }));
  }

  async listVersions(notePath: string): Promise<{ timestamp: number; filename: string }[]> {
    const normalized = notePath.replace(/\.md$/, "");

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
    const normalized = notePath.replace(/\.md$/, "");

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
    const normalized = notePath.replace(/\.md$/, "");

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
