import { NextResponse } from "next/server";
import { getStorageContext } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

// One-time / on-demand backfill of the note index (note_links, note_tags).
// Required once after deploying the cloud index layer; safe to re-run.
export async function POST() {
  try {
    const ctx = await getStorageContext();
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    if (typeof storage.reindexAll !== "function") {
      return NextResponse.json(
        { ok: false, error: "Indexing not supported for this storage mode" },
        { status: 400 }
      );
    }
    await storage.reindexAll();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Reindex error:", e);
    return NextResponse.json({ ok: false, error: "Reindex failed" }, { status: 500 });
  }
}
