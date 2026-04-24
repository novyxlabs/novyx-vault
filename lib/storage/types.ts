export interface NoteEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: NoteEntry[];
  modifiedAt?: string;
}

export interface TrashEntry {
  id: string;
  name: string;
  originalPath: string;
  deletedAt: string;
  isFolder: boolean;
}

export interface NoteFile {
  relPath: string;
  name: string;
  content: string;
  modifiedAt: Date;
}

export interface SearchFilters {
  folder?: string;
  tag?: string;
}

export interface StorageAdapter {
  // CRUD
  listNotes(dirPath?: string): Promise<NoteEntry[]>;
  readNote(notePath: string): Promise<string>;
  writeNote(notePath: string, content: string): Promise<void>;
  createFolder(folderPath: string): Promise<void>;
  deleteNote(notePath: string): Promise<void>;
  renameNote(oldPath: string, newPath: string): Promise<void>;

  // Trash
  listTrash(): Promise<TrashEntry[]>;
  restoreFromTrash(id: string): Promise<string>;
  purgeFromTrash(id: string): Promise<void>;
  emptyTrash(): Promise<void>;

  // Walk all notes (replaces duplicated walkFiles across routes)
  walkAllNotes(): Promise<NoteFile[]>;
  searchNoteFiles?(query: string, maxResults?: number, filters?: SearchFilters): Promise<NoteFile[]>;

  // Export (binary content for ZIP)
  exportAll(): Promise<{ name: string; data: Buffer }[]>;

  // History / Versions
  listVersions(notePath: string): Promise<{ timestamp: number; filename: string }[]>;
  readVersion(notePath: string, timestamp: string): Promise<string>;
  saveVersion(notePath: string, content: string): Promise<number>;
}
