import { getContextNow } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";

export async function GET() {
  try {
    await getStorageContext();
    const result = await getContextNow();
    if (!result) {
      return Response.json({ recent: [], recentCount: 0, upcoming: [], upcomingCount: 0, lastSessionAt: null });
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch context" }, { status: 500 });
  }
}
