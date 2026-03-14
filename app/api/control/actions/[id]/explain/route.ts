import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";

const BASE_URL = "https://novyx-ram-api.fly.dev";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });

    const { id } = await params;
    const res = await fetch(`${BASE_URL}/v1/actions/${id}/explain`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return Response.json(await res.json());
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to explain action" }, { status: 500 });
  }
}
