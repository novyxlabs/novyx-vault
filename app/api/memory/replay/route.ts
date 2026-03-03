import { NextRequest } from "next/server";
import { getReplayTimeline, getMemoryDrift } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, requireFeature } from "@/lib/novyx";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const gated = await requireFeature(apiKey, "replay");
    if (gated) return gated;
    const { searchParams } = req.nextUrl;
    const type = searchParams.get("type") || "timeline";

    if (type === "drift") {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      if (!from || !to) {
        return Response.json({ error: "Missing from/to params" }, { status: 400 });
      }
      const drift = await getMemoryDrift(from, to, apiKey ?? undefined);
      return Response.json({ drift });
    }

    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const result = await getReplayTimeline(limit, apiKey ?? undefined);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch replay data" }, { status: 500 });
  }
}
