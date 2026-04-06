import { getStorageContext } from "@/lib/auth";
import { getUserNovyxKey } from "@/lib/novyx";
import { explainAction } from "@/lib/control";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getStorageContext();
    const apiKey = await getUserNovyxKey(ctx.userId, ctx.cookieHeader);
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 401 });

    const { id } = await params;
    const result = await explainAction(id, apiKey);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "Failed to explain action" }, { status: 500 });
  }
}
