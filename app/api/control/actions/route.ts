import { NextRequest } from "next/server";
import { getActions, isControlConfigured } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    if (!isControlConfigured()) {
      return Response.json({ actions: [], total: 0, connected: false });
    }

    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getActions({ status, limit, offset }, apiKey);
    return Response.json({ ...result, connected: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch actions" }, { status: 500 });
  }
}
