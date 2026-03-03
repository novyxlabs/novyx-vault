export interface NoteEntry {
  name: string;
  path: string;
  isFolder: boolean;
  children?: NoteEntry[];
}

export function flattenNotes(notes: NoteEntry[]): NoteEntry[] {
  const result: NoteEntry[] = [];
  for (const entry of notes) {
    if (entry.isFolder && entry.children) {
      result.push(...flattenNotes(entry.children));
    } else if (!entry.isFolder) {
      result.push(entry);
    }
  }
  return result;
}

export function resolveWikiLink(linkText: string, notes: NoteEntry[]): string | null {
  const flat = flattenNotes(notes);
  const lower = linkText.toLowerCase().trim();

  // Exact name match (case-insensitive)
  const byName = flat.find((n) => n.name.toLowerCase() === lower);
  if (byName) return byName.path;

  // Path match (without .md, case-insensitive)
  const byPath = flat.find((n) => n.path.toLowerCase().replace(/\.md$/, "") === lower);
  if (byPath) return byPath.path;

  // Partial path match (ends with /linkText)
  const byPartial = flat.find((n) => n.path.toLowerCase().endsWith("/" + lower));
  if (byPartial) return byPartial.path;

  return null;
}
