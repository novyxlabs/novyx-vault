import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

const BASE_URL = "https://novyx-ram-api.fly.dev";

export async function GET() {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${BASE_URL}/v1/eval/gate`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      return Response.json(data);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to fetch health" }, { status: 500 });
  }
}
