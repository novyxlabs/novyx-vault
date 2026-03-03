import { NextRequest } from "next/server";
import { getAuditLog } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const entries = await getAuditLog(limit, apiKey ?? undefined);
    return Response.json({ entries });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
