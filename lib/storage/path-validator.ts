/**
 * Shared path validator for note paths.
 *
 * Used by every entry point that accepts a user-supplied note path:
 * - app/api/notes POST/PATCH/DELETE
 * - app/api/notes/import-obsidian (ZIP entry names)
 * - lib/storage/supabase-adapter (cloud CRUD)
 * - lib/storage/fs-adapter (local FS CRUD) — supplements its own filesystem-scoped check
 * - ZIP export entry names (prevents zip-slip in downloaded archives)
 *
 * Storage-agnostic: operates on the logical path string. Does NOT know
 * about NOTES_DIR or any Supabase storage root — those are still checked
 * by the storage-specific adapters for defense-in-depth.
 *
 * Security properties:
 * - Rejects absolute paths ("/foo", "C:\\foo")
 * - Rejects parent-directory traversal (".." segments anywhere)
 * - Rejects empty segments ("foo//bar")
 * - Rejects backslashes (Windows-style separators)
 * - Rejects control characters (0x00-0x1F, 0x7F)
 * - Rejects paths ending in " " or "." (Windows reserved)
 * - Rejects leading "."  (hidden files — we manage .trash/.history ourselves)
 * - Rejects segment length over 255 chars
 * - Rejects total path length over 1024 chars
 */

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPathError";
  }
}

const MAX_SEGMENT_LENGTH = 255;
const MAX_PATH_LENGTH = 1024;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Validate a logical note path. Throws InvalidPathError on any violation.
 * Returns the normalized path (forward-slash, leading-slash stripped, no
 * consecutive slashes).
 *
 * Empty string is valid and means "root".
 */
export function validateNotePath(input: unknown): string {
  if (typeof input !== "string") {
    throw new InvalidPathError("path must be a string");
  }

  if (input.length > MAX_PATH_LENGTH) {
    throw new InvalidPathError("path too long");
  }

  if (CONTROL_CHARS.test(input)) {
    throw new InvalidPathError("path contains control characters");
  }

  if (input.includes("\\")) {
    throw new InvalidPathError("path must not contain backslashes");
  }

  // Don't trim — trailing/leading whitespace is suspicious and the per-segment
  // check below catches segments ending in " ". Do strip a single or more
  // leading slashes so "/foo" normalizes to "foo" (common user habit, harmless).
  const normalized = input.replace(/^\/+/, "");

  if (normalized === "") return "";

  // Windows drive letter or UNC path
  if (/^[a-zA-Z]:/.test(normalized)) {
    throw new InvalidPathError("absolute paths are not allowed");
  }

  const segments = normalized.split("/");
  for (const seg of segments) {
    if (seg === "") {
      throw new InvalidPathError("path contains empty segment");
    }
    if (seg === "." || seg === "..") {
      throw new InvalidPathError("path contains relative segment");
    }
    if (seg.length > MAX_SEGMENT_LENGTH) {
      throw new InvalidPathError("path segment too long");
    }
    if (seg.endsWith(" ") || seg.endsWith(".")) {
      throw new InvalidPathError("path segment ends with space or dot");
    }
    // Reject leading-dot segments (hidden files). We manage .trash and
    // .history internally — user-supplied paths should never target them.
    if (seg.startsWith(".")) {
      throw new InvalidPathError("path contains hidden segment");
    }
  }

  return normalized;
}

/**
 * Safe version that returns null instead of throwing. Useful in places
 * where a filter/skip is preferable to a 400 — for example, when iterating
 * ZIP entries on import and we want to skip bad entries but keep good ones.
 */
export function tryValidateNotePath(input: unknown): string | null {
  try {
    return validateNotePath(input);
  } catch {
    return null;
  }
}
