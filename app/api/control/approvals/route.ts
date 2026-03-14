import { NextRequest } from "next/server";
import { getApprovals } from "@/lib/control";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) {
      return Response.json({ error: "No Novyx API key configured" }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await getApprovals({ status, limit }, apiKey);
    return Response.json({ ...result, connected: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
