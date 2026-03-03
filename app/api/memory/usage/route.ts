import { getMemoryUsage } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey, getFeatureGating } from "@/lib/novyx";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const [usage, gating] = await Promise.all([
      getMemoryUsage(apiKey ?? undefined),
      apiKey ? getFeatureGating(apiKey) : null,
    ]);
    return Response.json({ usage: usage || {}, gating });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
