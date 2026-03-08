import { NextRequest } from "next/server";
import { getAuditLog } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, getNovyxForKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Include raw sample for field debugging
    let rawSample: Record<string, unknown> | null = null;
    if (apiKey) {
      const nx = getNovyxForKey(apiKey);
      if (nx) {
        try {
          const raw = await nx.audit({ limit: 1 });
          if (raw.length > 0) rawSample = raw[0] as unknown as Record<string, unknown>;
        } catch { /* ignore */ }
      }
    }

    const entries = await getAuditLog(limit, apiKey ?? undefined);
    return Response.json({ entries, _rawSampleKeys: rawSample ? Object.keys(rawSample) : null, _rawSample: rawSample });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
