import { NextRequest, NextResponse } from "next/server";
import { findBacklinks } from "@/lib/backlinks";
import { getStorageContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const notePath = req.nextUrl.searchParams.get("path");

  if (!notePath) {
    return NextResponse.json({ backlinks: [] });
  }

  try {
    const ctx = await getStorageContext();
    const backlinks = await findBacklinks(notePath, ctx);
    return NextResponse.json({ backlinks });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Backlinks error:", e);
    return NextResponse.json({ backlinks: [] }, { status: 500 });
  }
}
