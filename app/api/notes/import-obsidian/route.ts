import { NextRequest, NextResponse } from "next/server";
import { inflateRawSync } from "zlib";
import { getStorageContext } from "@/lib/auth";
import { writeNote } from "@/lib/notes";

export const runtime = "nodejs";

// POST — import Obsidian vault from uploaded zip
export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
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
    return NextResponse.json({ error: message }, { status: 500 });
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

  while (offset < buffer.length - 4) {
    const sig = view.getUint32(offset, true);

    // Local file header signature
    if (sig !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);

    const nameBytes = buffer.subarray(offset + 30, offset + 30 + nameLength);
    const name = new TextDecoder("utf-8").decode(nameBytes);

    const dataStart = offset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;

    const isDirectory = name.endsWith("/");

    if (!isDirectory && compressionMethod === 0 && compressedSize > 0) {
      // Stored (no compression)
      entries.push({
        name,
        data: new Uint8Array(buffer.subarray(dataStart, dataEnd)),
        isDirectory: false,
      });
    } else if (!isDirectory && compressionMethod === 8) {
      // Deflate — decompress using built-in zlib
      try {
        const compressed = buffer.subarray(dataStart, dataEnd);
        const decompressed = inflateRawSync(compressed);
        entries.push({
          name,
          data: new Uint8Array(decompressed),
          isDirectory: false,
        });
      } catch {
        // Skip files we can't decompress
        entries.push({ name, data: new Uint8Array(0), isDirectory: false });
      }
    } else if (isDirectory) {
      entries.push({ name, data: new Uint8Array(0), isDirectory: true });
    }

    offset = dataEnd;

    // Check for data descriptor
    if (view.getUint32(offset, true) === 0x08074b50) {
      offset += 16; // Skip data descriptor
    }
  }

  return entries;
}
