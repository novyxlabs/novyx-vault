import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";

// GET /api/notes/history?path=notePath — list versions
export async function GET(req: NextRequest) {
  const notePath = req.nextUrl.searchParams.get("path") || "";
  if (!notePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  try {
    const ctx = await getStorageContext();
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const versions = await storage.listVersions(notePath);
    return NextResponse.json({ versions });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ versions: [] });
  }
}

// POST /api/notes/history — save a snapshot
export async function POST(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const { path: notePath, content } = await req.json();
    if (!notePath) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const ts = await storage.saveVersion(notePath, content);
    return NextResponse.json({ ok: true, timestamp: ts });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("History save error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
