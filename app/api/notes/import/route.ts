import { NextResponse } from "next/server";
import { isCloudMode, getStorageContext } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import { FsAdapter } from "@/lib/storage/fs-adapter";
import { createServiceSupabase } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";
import os from "os";

const LOCAL_DIR = path.join(os.homedir(), "SecondBrain");

async function localNotesExist(): Promise<number> {
  try {
    const adapter = new FsAdapter();
    const notes = await adapter.walkAllNotes();
    return notes.length;
  } catch {
    return 0;
  }
}

export async function GET() {
  // Only available in cloud mode
  if (!isCloudMode()) {
    return NextResponse.json({ available: false });
  }

  // Check if local directory exists
  try {
    await fs.access(LOCAL_DIR);
  } catch {
    return NextResponse.json({ available: false });
  }

  // Check if user already imported
  let ctx: { userId?: string };
  try {
    ctx = await getStorageContext();
  } catch {
    return NextResponse.json({ available: false });
  }

  if (!ctx.userId) {
    return NextResponse.json({ available: false });
  }

  const svc = createServiceSupabase();
  const { data: profile } = await svc
    .from("profiles")
    .select("import_completed_at")
    .eq("id", ctx.userId)
    .single();

  if (profile?.import_completed_at) {
    return NextResponse.json({ available: false });
  }

  const noteCount = await localNotesExist();
  if (noteCount === 0) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json({ available: true, noteCount });
}

export async function POST() {
  if (!isCloudMode()) {
    return NextResponse.json({ error: "Not in cloud mode" }, { status: 400 });
  }

  let ctx: { userId?: string; cookieHeader?: string };
  try {
    ctx = await getStorageContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read all local notes
    const localAdapter = new FsAdapter();
    const localNotes = await localAdapter.walkAllNotes();

    if (localNotes.length === 0) {
      return NextResponse.json({ imported: 0 });
    }

    // Write each to cloud storage
    const cloudStorage = getStorage(ctx.userId, ctx.cookieHeader);
    let imported = 0;

    for (const note of localNotes) {
      try {
        // Ensure parent folder exists by creating the note directly
        await cloudStorage.writeNote(note.relPath, note.content);
        imported++;
      } catch (err) {
        console.error(`Failed to import note ${note.relPath}:`, err);
      }
    }

    // Mark import as completed
    const svc = createServiceSupabase();
    await svc
      .from("profiles")
      .update({ import_completed_at: new Date().toISOString() })
      .eq("id", ctx.userId);

    return NextResponse.json({ imported });
  } catch (err) {
    console.error("Import failed:", err);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}
