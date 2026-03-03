import { getContextNow } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    const result = await getContextNow(apiKey ?? undefined);
    if (!result) {
      return Response.json({ recent: [], recentCount: 0, upcoming: [], upcomingCount: 0, lastSessionAt: null });
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch context" }, { status: 500 });
  }
}
