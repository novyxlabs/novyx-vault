import { NextRequest } from "next/server";
import { getCortexInsights, runCortex } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await getStorageContext();
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const result = await getCortexInsights(limit);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await getStorageContext();
    const result = await runCortex();
    if (!result) {
      return Response.json({ error: "Cortex unavailable" }, { status: 500 });
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to run cortex" }, { status: 500 });
  }
}
