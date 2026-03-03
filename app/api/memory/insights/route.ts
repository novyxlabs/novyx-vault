import { NextRequest } from "next/server";
import { getCortexInsights, runCortex } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, requireFeature } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const gated = await requireFeature(apiKey, "insights");
    if (gated) return gated;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const result = await getCortexInsights(limit, apiKey ?? undefined);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const gated = await requireFeature(apiKey, "cortex");
    if (gated) return gated;
    const result = await runCortex(apiKey ?? undefined);
    if (!result) {
      return Response.json({ error: "Cortex unavailable" }, { status: 500 });
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to run cortex" }, { status: 500 });
  }
}
