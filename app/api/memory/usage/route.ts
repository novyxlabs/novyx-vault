import { getMemoryUsage } from "@/lib/memory";
import { getStorageContext } from "@/lib/auth";

export async function GET() {
  try {
    await getStorageContext();
    const usage = await getMemoryUsage();
    return Response.json({ usage: usage || {} });
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
