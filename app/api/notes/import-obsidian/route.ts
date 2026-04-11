import { NextRequest, NextResponse } from "next/server";
import { inflateRawSync } from "zlib";
import { getStorageContext } from "@/lib/auth";
import { writeNote } from "@/lib/notes";
import { tryValidateNotePath } from "@/lib/storage/path-validator";

export const runtime = "nodejs";

const MAX_ZIP_SIZE = 4 * 1024 * 1024; // 4MB — must stay under Vercel's 4.5MB body limit
const MAX_ENTRY_COUNT = 5000;
const MAX_ENTRY_UNCOMPRESSED_SIZE = 2 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;

// POST — import Obsidian vault from uploaded zip
export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json({ error: "Zip file too large" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse zip file manually (no external deps)
    const entries = parseZip(buffer);

    let imported = 0;
    let skipped = 0;
    const tags: Set<string> = new Set();

    for (const entry of entries) {
      // Skip directories, hidden files, and non-markdown
      if (entry.isDirectory) continue;
      if (entry.name.startsWith(".") || entry.name.includes("/.")) {
        skipped++;
        continue;
      }

      const ext = entry.name.split(".").pop()?.toLowerCase();
      if (ext !== "md" && ext !== "markdown" && ext !== "txt") {
        skipped++;
        continue;
      }

      // Decode content
      let content: string;
      try {
        content = new TextDecoder("utf-8").decode(entry.data);
      } catch {
        skipped++;
        continue;
      }

      // Convert Obsidian wikilinks to Vault format (they're the same [[link]] format)
      // Convert Obsidian ![[image]] embeds to markdown images (best effort)
      content = content.replace(/!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, file, alt) => {
        return `![${alt || file}](${file})`;
      });

      // Extract folder path from zip entry name
      // e.g. "MyVault/subfolder/note.md" → "subfolder/note"
      let notePath = entry.name;

      // Remove the top-level vault folder if all entries share one
      const parts = notePath.split("/");
      if (parts.length > 1) {
        // Remove the first folder (vault root)
        notePath = parts.slice(1).join("/");
      }

      // Remove .md extension for storage
      notePath = notePath.replace(/\.(md|markdown|txt)$/, "");

      if (!notePath.trim()) {
        skipped++;
        continue;
      }

      // Validate the post-stripped path against the shared validator so
      // malicious ZIP entry names (../../etc, //, absolute paths, control
      // chars) can never reach the storage layer. FS mode had its own
      // check downstream; cloud mode did not — this closes that gap.
      const validated = tryValidateNotePath(notePath);
      if (validated === null) {
        skipped++;
        continue;
      }
      notePath = validated;

      // Extract tags from content
      const tagMatches = content.match(/#[a-zA-Z][\w-]*/g);
      if (tagMatches) tagMatches.forEach((t) => tags.add(t));

      try {
        await writeNote(notePath, content, ctx);
        imported++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      tags: Array.from(tags).slice(0, 50),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Unknown error";
    const status =
      message.includes("zip") || message.includes("Zip") || message.includes("Malformed")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// Minimal zip parser — handles standard zip files without external dependencies
interface ZipEntry {
  name: string;
  data: Uint8Array;
  isDirectory: boolean;
}

function parseZip(buffer: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;
  let totalUncompressed = 0;

  while (offset < buffer.length - 4) {
    if (entries.length >= MAX_ENTRY_COUNT) {
      throw new Error("Zip archive contains too many entries");
    }

    const sig = view.getUint32(offset, true);

    // Local file header signature
    if (sig !== 0x04034b50) break;

    if (offset + 30 > buffer.length) {
      throw new Error("Malformed zip archive");
    }

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const headerEnd = offset + 30 + nameLength + extraLength;

    if (headerEnd > buffer.length) {
      throw new Error("Malformed zip archive");
    }
    if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED_SIZE) {
      throw new Error("Zip entry exceeds size limit");
    }
    if (totalUncompressed + uncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
      throw new Error("Zip archive expands beyond allowed size");
    }

    const nameBytes = buffer.subarray(offset + 30, offset + 30 + nameLength);
    const name = new TextDecoder("utf-8").decode(nameBytes);

    const dataStart = headerEnd;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > buffer.length) {
      throw new Error("Malformed zip archive");
    }

    const isDirectory = name.endsWith("/");

    if (!isDirectory && compressionMethod === 0 && compressedSize > 0) {
      // Stored (no compression)
      entries.push({
        name,
        data: new Uint8Array(buffer.subarray(dataStart, dataEnd)),
        isDirectory: false,
      });
      totalUncompressed += uncompressedSize;
    } else if (!isDirectory && compressionMethod === 8) {
      // Deflate — decompress using built-in zlib
      try {
        const compressed = buffer.subarray(dataStart, dataEnd);
        const decompressed = inflateRawSync(compressed);
        if (decompressed.length > MAX_ENTRY_UNCOMPRESSED_SIZE) {
          throw new Error("Zip entry exceeds size limit");
        }
        if (totalUncompressed + decompressed.length > MAX_TOTAL_UNCOMPRESSED_SIZE) {
          throw new Error("Zip archive expands beyond allowed size");
        }
        entries.push({
          name,
          data: new Uint8Array(decompressed),
          isDirectory: false,
        });
        totalUncompressed += decompressed.length;
      } catch {
        throw new Error("Invalid or unsupported zip entry");
      }
    } else if (isDirectory) {
      entries.push({ name, data: new Uint8Array(0), isDirectory: true });
    } else {
      throw new Error("Unsupported zip compression method");
    }

    offset = dataEnd;

    // Check for data descriptor
    if (offset + 4 <= buffer.length && view.getUint32(offset, true) === 0x08074b50) {
      offset += 16; // Skip data descriptor
    }
  }

  return entries;
}
