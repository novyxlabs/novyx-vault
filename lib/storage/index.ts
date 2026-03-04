import type { StorageAdapter } from "./types";
import { FsAdapter } from "./fs-adapter";

export type { StorageAdapter, NoteEntry, TrashEntry, NoteFile } from "./types";

export function getStorage(userId?: string, cookieHeader?: string): StorageAdapter {
  if (process.env.STORAGE_MODE === "supabase") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseAdapter } = require("./supabase-adapter");
    if (!userId) throw new Error("userId required in cloud mode");
    return new SupabaseAdapter(userId, cookieHeader);
  }
  return new FsAdapter();
}
