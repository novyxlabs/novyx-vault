import { NextRequest, NextResponse } from "next/server";
import { findConnections } from "@/lib/connections";
import { getStorageContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const notePath = req.nextUrl.searchParams.get("path");

  if (!notePath) {
    return NextResponse.json({ connections: [] });
  }

  try {
    const ctx = await getStorageContext();
    const connections = await findConnections(notePath, 5, ctx);
    return NextResponse.json({ connections });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("Connections error:", e);
    return NextResponse.json({ connections: [] }, { status: 500 });
  }
}
