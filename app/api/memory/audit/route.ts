import { NextRequest } from "next/server";
import { getAuditLog, verifyAuditChain } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const entries = await getAuditLog(limit, apiKey ?? undefined);

    // Derive chain head from entry hashes
    const hashes = entries.map((e) => e.entry_hash).filter(Boolean);
    const chain_head = hashes[0] || null;
    const chain_length = hashes.length;

    // Real chain verification via Novyx API (Pro tier only)
    const verification = await verifyAuditChain(apiKey ?? undefined);
    const chain_verified = verification ? verification.integrity_guarantee : null;
    const chain_status = verification ? verification.status : null;

    return Response.json({ entries, chain_head, chain_length, chain_verified, chain_status });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
