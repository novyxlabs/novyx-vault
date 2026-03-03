import { NextRequest, NextResponse } from "next/server";
import { searchNotes } from "@/lib/search";
import { getStorageContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const folder = req.nextUrl.searchParams.get("folder") || undefined;
  const tag = req.nextUrl.searchParams.get("tag") || undefined;

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const ctx = await getStorageContext();
    const results = await searchNotes(q.trim(), 30, { folder, tag }, ctx);
    return NextResponse.json({ results });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Search error:", e);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
