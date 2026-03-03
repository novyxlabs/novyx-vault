import { getStorage } from "./storage";
import type { NoteEntry, TrashEntry } from "./storage";

export type { NoteEntry, TrashEntry };

export interface StorageContext {
  userId?: string;
  cookieHeader?: string;
}

function store(ctx?: StorageContext) {
  return getStorage(ctx?.userId, ctx?.cookieHeader);
}

export const listNotes = (dirPath?: string, ctx?: StorageContext) => store(ctx).listNotes(dirPath);
export const readNote = (notePath: string, ctx?: StorageContext) => store(ctx).readNote(notePath);
export const writeNote = (notePath: string, content: string, ctx?: StorageContext) => store(ctx).writeNote(notePath, content);
export const createFolder = (folderPath: string, ctx?: StorageContext) => store(ctx).createFolder(folderPath);
export const deleteNote = (notePath: string, ctx?: StorageContext) => store(ctx).deleteNote(notePath);
export const renameNote = (oldPath: string, newPath: string, ctx?: StorageContext) => store(ctx).renameNote(oldPath, newPath);
export const listTrash = (ctx?: StorageContext) => store(ctx).listTrash();
export const restoreFromTrash = (id: string, ctx?: StorageContext) => store(ctx).restoreFromTrash(id);
export const purgeFromTrash = (id: string, ctx?: StorageContext) => store(ctx).purgeFromTrash(id);
export const emptyTrash = (ctx?: StorageContext) => store(ctx).emptyTrash();
