import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { getStorageContext } from "@/lib/auth";

// GET /api/notes/history/version?path=notePath&ts=timestamp
export async function GET(req: NextRequest) {
  const notePath = req.nextUrl.searchParams.get("path") || "";
  const ts = req.nextUrl.searchParams.get("ts") || "";

  if (!notePath || !ts) {
    return NextResponse.json({ error: "Missing path or ts" }, { status: 400 });
  }

  try {
    const ctx = await getStorageContext();
    const storage = getStorage(ctx.userId, ctx.cookieHeader);
    const content = await storage.readVersion(notePath, ts);
    return NextResponse.json({ content });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }
}
